const DEFAULT_SITE_URL = 'https://letters.entr.cc';
const DEFAULT_ENTR_URL = 'https://entr.cc';
const DEFAULT_INSTAGRAM_URL = 'https://instagram.com/entr.cc';
const DEFAULT_FACEBOOK_URL = 'https://facebook.com/entr.cc';
const DEFAULT_LINKEDIN_URL = 'https://www.linkedin.com/in/josephiesue';
const DEFAULT_LOGO_URL = `${DEFAULT_SITE_URL}/assets/entr-icon-lead-letter-blue-email.png`;
const DEFAULT_SUBJECT = 'Welcome to The Lead Letter';
const DEFAULT_PREVIEW = 'So glad you signed up for The Lead Letter. Keep your eye on your inbox for updates from EntrLabs.';

const BRAND = {
  ink: '#0a0f1c',
  raise: '#131c32',
  muted: '#6b7a99',
  paperAlt: '#eef1fb',
  surface: '#ffffff',
  line: '#d6e0fb',
  border: '#b9c9f5',
  azureDeep: '#2e5bd0',
};

function htmlEscape(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function leadLetterMarkHtml() {
  const logoUrl = htmlEscape(process.env.LEAD_LETTER_LOGO_URL || DEFAULT_LOGO_URL);

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td style="width: 30px;">
          <img src="${logoUrl}" width="30" height="30" alt="ENTR" style="display: block; width: 30px; height: 30px; border: 0; outline: none; text-decoration: none;">
        </td>
        <td style="padding-left: 14px; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.4; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: ${BRAND.ink};">The Lead Letter</td>
      </tr>
    </table>
  `;
}

function actionLinkHtml({ href, label, detail }) {
  return `
    <tr>
      <td style="padding: 0 0 12px;">
        <a href="${htmlEscape(href)}" style="display: block; padding: 15px 16px; border: 1px solid ${BRAND.line}; background: #ffffff; font-family: Arial, Helvetica, sans-serif; color: ${BRAND.ink}; text-decoration: none;">
          <span style="display: block; margin: 0 0 4px; font-size: 13px; line-height: 1.4; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: ${BRAND.azureDeep};">${htmlEscape(label)}</span>
          <span style="display: block; font-size: 13px; line-height: 1.6; color: ${BRAND.raise};">${htmlEscape(detail)}</span>
        </a>
      </td>
    </tr>
  `;
}

function buildHtmlEmail() {
  const entrUrl = trimTrailingSlash(process.env.ENTR_URL || DEFAULT_ENTR_URL);
  const instagramUrl = process.env.ENTR_INSTAGRAM_URL || DEFAULT_INSTAGRAM_URL;
  const facebookUrl = process.env.ENTR_FACEBOOK_URL || DEFAULT_FACEBOOK_URL;
  const linkedInUrl = process.env.JOSEPH_LINKEDIN_URL || DEFAULT_LINKEDIN_URL;
  const preview = process.env.SENDFOX_WELCOME_PREVIEW || DEFAULT_PREVIEW;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>Welcome to The Lead Letter</title>
  </head>
  <body style="margin: 0; padding: 0; background: ${BRAND.paperAlt}; color: ${BRAND.ink};">
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent; mso-hide: all;">${htmlEscape(preview)}</div>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: ${BRAND.paperAlt};">
      <tr>
        <td align="center" style="padding: 28px 16px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; max-width: 640px; background: ${BRAND.surface}; border: 1px solid ${BRAND.border}; box-shadow: 0 0 0 1px rgba(255,255,255,0.72) inset;">
            <tr>
              <td style="padding: 28px 34px 20px; border-bottom: 1px solid ${BRAND.line}; background: linear-gradient(135deg, #ffffff 0%, #f2f6ff 100%);">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td>${leadLetterMarkHtml()}</td>
                    <td align="right" style="font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.4; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: ${BRAND.azureDeep};">Welcome</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 38px 34px 10px;">
                <p style="margin: 0 0 14px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.4; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: ${BRAND.azureDeep};">EntrLabs</p>
                <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 38px; line-height: 1.02; font-weight: 900; color: ${BRAND.ink};">So glad you signed up for the Lead Letters!</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 18px 34px 8px;">
                <p style="margin: 0 0 18px; font-family: Georgia, 'Times New Roman', serif; font-size: 19px; line-height: 1.65; color: ${BRAND.raise};">Keep your eye on your inbox. When we have information to support you on your journey to become a service-minded leader and successful professional, we will send updates and content.</p>
                <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.7; color: ${BRAND.muted};">In the meantime, make sure to follow on social:</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 18px 34px 24px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  ${actionLinkHtml({
                    href: entrUrl,
                    label: 'Main Site',
                    detail: 'Click here to see our Main Site',
                  })}
                  ${actionLinkHtml({
                    href: instagramUrl,
                    label: 'Instagram',
                    detail: 'Click here to follow us on Instagram',
                  })}
                  ${actionLinkHtml({
                    href: facebookUrl,
                    label: 'Facebook',
                    detail: 'Click here to follow us on Facebook',
                  })}
                  ${actionLinkHtml({
                    href: linkedInUrl,
                    label: 'LinkedIn',
                    detail: 'Click here to follow me on LinkedIn',
                  })}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 34px 34px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top: 1px solid ${BRAND.line}; background: #f7f9ff;">
                  <tr>
                    <td style="padding: 18px 18px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.7; color: ${BRAND.raise};">
                      Talk to you soon,<br>
                      <strong>EntrLabs</strong>
                    </td>
                  </tr>
                </table>
                <p style="margin: 18px 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.7; color: ${BRAND.muted};">© EntrLabs, a research lab of ENTR. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildTextEmail() {
  const entrUrl = trimTrailingSlash(process.env.ENTR_URL || DEFAULT_ENTR_URL);
  const instagramUrl = process.env.ENTR_INSTAGRAM_URL || DEFAULT_INSTAGRAM_URL;
  const facebookUrl = process.env.ENTR_FACEBOOK_URL || DEFAULT_FACEBOOK_URL;
  const linkedInUrl = process.env.JOSEPH_LINKEDIN_URL || DEFAULT_LINKEDIN_URL;

  return [
    'So glad you signed up for the Lead Letters!',
    '',
    'Keep your eye on your inbox. When we have information to support you on your journey to become a service-minded leader and successful professional, we will send updates and content.',
    '',
    'In the meantime, make sure to follow on social:',
    '',
    `Click here to see our Main Site: ${entrUrl}`,
    `Click here to follow us on Instagram: ${instagramUrl}`,
    `Click here to follow us on Facebook: ${facebookUrl}`,
    `Click here to follow me on LinkedIn: ${linkedInUrl}`,
    '',
    'Talk to you soon,',
    'EntrLabs',
    '',
    '© EntrLabs, a research lab of ENTR. All rights reserved.',
  ].join('\n');
}

function buildEmail() {
  return {
    name: 'Lead Letter Welcome Email',
    subject: process.env.SENDFOX_WELCOME_SUBJECT || DEFAULT_SUBJECT,
    preview_text: process.env.SENDFOX_WELCOME_PREVIEW || DEFAULT_PREVIEW,
    content_html: buildHtmlEmail(),
    content_text: buildTextEmail(),
  };
}

const email = buildEmail();

if (process.env.SENDFOX_HTML_ONLY === 'true') {
  console.log(email.content_html);
} else if (process.env.SENDFOX_TEXT_ONLY === 'true') {
  console.log(email.content_text);
} else {
  console.log(`[dry run] ${email.subject}`);
  console.log(`[dry run] preview: ${email.preview_text}`);

  if (process.env.SENDFOX_DEBUG_PAYLOAD === 'true') {
    console.log(JSON.stringify(email, null, 2));
  }
}
