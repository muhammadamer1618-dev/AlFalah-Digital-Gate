Rased Virtual Classroom – deployment prerequisites

This page is a safe classroom interface shell, not yet a live video service. It intentionally does not issue LiveKit tokens in browser code.

Before enabling rooms:
1. Create a LiveKit Cloud project and obtain the server URL, API key, and API secret.
2. Store the API key and secret only as server-side secrets. Never put them in GitHub Pages or browser JavaScript.
3. Deploy a token/API service that securely verifies the existing Rased identity. The current portal reads role and email values from browser storage and Firestore documents; these values alone are not proof of identity.
4. Connect that service to the actual identity provider/session validation used by student, teacher, supervisor, and admin portals.
5. Enforce server-side room permissions: students join with audio/video disabled; teacher can grant/revoke individual participant publish permissions; supervisor joins as observer; admin can observe all rooms.
6. Configure room lifecycle, attendance events, reconnect handling, and Firestore write permissions before production.

Current state:
- rased/virtual-classroom.html provides the Arabic classroom interface and checks lesson/assignment metadata.
- Joining is deliberately blocked until a secure token endpoint is deployed.
- Existing Google Meet workflow remains unchanged.
- No LiveKit credentials are stored in this repository.
