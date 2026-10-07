# WhatsApp Notifications

Guru Fitness uses a Supabase Edge Function for official Meta WhatsApp Cloud API requests. The browser invokes `whatsapp-notifications`; provider credentials remain server-side.

## Required setup

1. Apply the existing database migration that creates `message_templates`, `notifications`, and `message_logs` if those tables are not present.
2. Add active WhatsApp rows to `message_templates` for `membership_expiring_soon`, `membership_expired`, `membership_renewed`, `payment_received`, and `payment_reminder`. Use `{{member_name}}`, `{{member_code}}`, `{{plan_name}}`, `{{expiry_date}}`, `{{amount}}`, `{{payment_method}}`, `{{payment_date}}`, `{{receipt_number}}`, and `{{gym_name}}` placeholders as needed.
3. Create and approve matching Meta WhatsApp template names, with body-variable order matching each database template.
4. Deploy `supabase/functions/whatsapp-notifications` and configure these Edge Function secrets: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_GRAPH_API_VERSION`, `WHATSAPP_TEMPLATE_LANGUAGE`, `WHATSAPP_TEMPLATE_MEMBERSHIP_EXPIRING_SOON`, `WHATSAPP_TEMPLATE_MEMBERSHIP_EXPIRED`, `WHATSAPP_TEMPLATE_MEMBERSHIP_RENEWED`, `WHATSAPP_TEMPLATE_PAYMENT_RECEIVED`, and `WHATSAPP_TEMPLATE_PAYMENT_REMINDER`.

The Supabase Edge Function runtime supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`; none belong in Vite environment variables or frontend code. The function requires an authenticated owner/admin, reads member and payment details from Supabase, sends only approved Meta templates, and records queued/sent/failed attempts in the existing notification tables. No scheduled sender is enabled.

Until the function, credentials, approved templates, and database template rows are configured, the UI must show **WhatsApp integration not configured** and must not report a message as sent.