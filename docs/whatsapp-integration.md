# WhatsApp Notifications

Guru Fitness uses a Supabase Edge Function for official Meta WhatsApp Cloud API requests. The browser invokes `whatsapp-notifications`; provider credentials remain server-side.

## Required setup

1. Apply the existing database migration that creates `message_templates`, `notifications`, and `message_logs` if those tables are not present.
2. Apply `008_member_qr_pass_notifications.sql` and `009_member_welcome_qr_template.sql`. These create the private `qr-passes` bucket, the RLS-protected `notification_log` table, and the `member_welcome_qr` template row. The client generates a QR image locally from the member's opaque QR token and uploads it. The resulting signed image URL is valid for one year; it is a bearer link during that period so Meta can retrieve the image over HTTPS. The token/image is not sent to a third-party QR-generation service.
3. Add active WhatsApp rows to `message_templates` for `membership_expiring_soon`, `membership_expired`, `membership_renewed`, `payment_received`, `payment_reminder`, `attendance_logged`, and `member_welcome_qr`. Use `{{member_name}}`, `{{member_code}}`, `{{plan_name}}`, `{{expiry_date}}`, `{{amount}}`, `{{payment_method}}`, `{{payment_date}}`, `{{receipt_number}}`, and `{{gym_name}}` placeholders as needed. The member-pass row must contain `{{member_name}}` followed by `{{expiry_date}}`.
4. Create and approve matching Meta WhatsApp template names, with body-variable order matching each database template. The member-pass template must use an Image header.
5. Deploy `supabase/functions/whatsapp-notifications` and configure these Edge Function secrets: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_GRAPH_API_VERSION`, `WHATSAPP_TEMPLATE_LANGUAGE`, `WHATSAPP_TEMPLATE_MEMBERSHIP_EXPIRING_SOON`, `WHATSAPP_TEMPLATE_MEMBERSHIP_EXPIRED`, `WHATSAPP_TEMPLATE_MEMBERSHIP_RENEWED`, `WHATSAPP_TEMPLATE_PAYMENT_RECEIVED`, `WHATSAPP_TEMPLATE_PAYMENT_REMINDER`, and `WHATSAPP_TEMPLATE_ATTENDANCE_LOGGED`. Legacy `WHATSAPP_TOKEN`/`WHATSAPP_PHONE_ID` names remain supported as fallback aliases. The member-pass template name is fixed to `member_welcome_qr`.
6. Reconcile the existing database migration history and resolve the tenant-security migration's documented schema gaps before applying it; then apply `012_serialize_whatsapp_pass_consent_withdrawal.sql`. Do not push the sequence over untracked migrations without reviewing their effects.

The Supabase Edge Function runtime supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`; none belong in Vite environment variables or frontend code. The function requires a valid authenticated gym profile with the appropriate role, reads member and payment details from Supabase, sends only approved Meta templates, and records member-pass attempts in `notification_log`. No scheduled sender is enabled.

## Member QR pass Meta template

- Category: Utility
- Header: Image
- Language: English
- Body: `Your Guru Fitness membership pass is ready, {{1}}. It expires on {{2}}.`

The body variables are the member name and membership expiry formatted as `DD MMM YYYY`, respectively.

Until the function, credentials, approved templates, and database template rows are configured, the UI must show **WhatsApp integration not configured** and must not report a message as sent.

## Consent withdrawal during a send

Migration `012` creates a per-member dispatch lock. Both QR-pass send paths acquire it before calling Meta and release it when the HTTP request completes. A consent withdrawal attempted during an active dispatch is rejected; retry the withdrawal after the send finishes. The lock deliberately has no automatic timeout: if a function invocation ends unexpectedly before releasing it, an operator must confirm that invocation has terminated before removing the stale row. Meta may deliver a request it accepted before consent withdrawal commits; the application cannot recall an accepted provider request.