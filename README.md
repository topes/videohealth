# VideoHealth

Experimental telemedicine web app on Amazon Chime SDK. Two-user video visits with
screenshare, chat, presence, a shared whiteboard, and collaborative notes. Deployed
to AWS via CloudFormation from GitHub Actions.

Live target: `https://video.tiagolopes.com`

---

## What's inside

```
apps/web/                 Vite + React + TypeScript frontend
services/api/             Lambda handlers (HTTP + WebSocket)
infra/
├── root.yaml             Root CFN stack
├── bootstrap.yaml        One-time OIDC + artifacts bucket
└── nested/
    ├── data.yaml         DynamoDB single table (byRoom GSI)
    ├── api.yaml          HTTP API, WebSocket API, Lambdas, IAM
    └── frontend.yaml     S3, CloudFront, ACM, Route53
.github/workflows/deploy.yml
```

## Architecture

- Media: **Amazon Chime SDK Meetings** (`CreateMeeting` / `CreateAttendee`), audio + video + content share.
- Realtime (chat, presence, Yjs sync for whiteboard/notes): **API Gateway WebSocket** → Lambda → broadcast via `PostToConnection`.
- State: **DynamoDB** single table with a `byRoom` GSI for connection fan-out. Rooms and connections have TTL.
- Static site: **S3 + CloudFront** (OAC), ACM DNS-validated cert, Route53 alias record.
- Deploys: **CloudFormation** via `aws cloudformation package/deploy` from GitHub Actions using OIDC (no long-lived keys).

## Local development

Requirements: Node 20+, an AWS account (for `CreateMeeting`) if you want to test end-to-end.

```
npm install
npm run typecheck
npm run build            # builds Lambdas + web
npm run dev:web          # start the web app locally on http://localhost:5173
```

The web app reads `VITE_API_URL` and `VITE_WS_URL` at build time. For a full local
loop, deploy the CFN stack first and copy the outputs to
`apps/web/.env.local`:

```
VITE_API_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com
VITE_WS_URL=wss://yyyyy.execute-api.us-east-1.amazonaws.com/prod
```

## One-time AWS bootstrap

You need to do this once per AWS account.

1. Confirm you own a Route53 hosted zone for `tiagolopes.com`. Note its **HostedZoneId** (e.g. `Z0123ABCD...`).
2. Deploy the OIDC + artifacts bucket bootstrap. Requires admin AWS creds locally.
   ```
   aws cloudformation deploy \
     --region us-east-1 \
     --template-file infra/bootstrap.yaml \
     --stack-name videohealth-bootstrap \
     --parameter-overrides \
       GitHubOrg=<your-github-username-or-org> \
       GitHubRepo=telemedicine \
       BranchFilter=refs/heads/main \
     --capabilities CAPABILITY_NAMED_IAM
   ```
3. Read the outputs:
   ```
   aws cloudformation describe-stacks \
     --stack-name videohealth-bootstrap \
     --query 'Stacks[0].Outputs'
   ```
4. In the GitHub repo, add these **Actions secrets**:

   | Secret             | Value                                                    |
   | ------------------ | -------------------------------------------------------- |
   | `AWS_ROLE_ARN`     | `DeployRoleArn` from the bootstrap outputs               |
   | `ARTIFACTS_BUCKET` | `ArtifactsBucket` from the bootstrap outputs             |
   | `HOSTED_ZONE_ID`   | Your Route53 hosted zone id for `tiagolopes.com`         |

5. Push to `main` — the `deploy` workflow runs and provisions everything.

The CloudFormation stack provisions an ACM certificate that uses DNS validation
via your hosted zone; validation records are created automatically. The first
deploy may take 10–20 minutes while the CloudFront distribution finishes rolling
out.

## Region

Everything is pinned to **`us-east-1`** because ACM certificates used by
CloudFront must live in `us-east-1`, and pinning the Chime `MediaRegion` there
keeps the signaling path simple. Chime clients still negotiate the closest edge
for actual media.

## Product flow

```
Landing  →  Create room  →  QR + code shown  →  Session
                          \
Landing  →  Join room     →  Session
Deep link /join/{CODE}    →  Join screen (prefilled) → Session
```

Session UI: main video stage with overlaid local preview, controls for mute /
camera / screenshare, presence chip, and a right sidebar with tabs for Chat,
Whiteboard (Yjs strokes), and Notes (Yjs text).

## Scope

This is an experiment. Explicitly out of scope:

- Cognito / real auth
- HIPAA controls
- Recording, PSTN dial-in, billing
- Multi-region, moderation, permanent medical records

Rooms and connection records auto-expire via DynamoDB TTL (24h / 6h).

## Cleanup

To tear the whole thing down:

```
aws cloudformation delete-stack --stack-name videohealth
```

Then, if you want to reclaim the bootstrap too:

```
aws s3 rb "s3://videohealth-artifacts-<account>-us-east-1" --force
aws cloudformation delete-stack --stack-name videohealth-bootstrap
```
