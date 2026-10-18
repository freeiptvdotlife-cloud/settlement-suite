// Sets a geo_consent cookie so client-side consent logic can skip the analytics
// consent gate for non-EU visitors. Runs at the edge on every request.
const EU_COUNTRIES = new Set([
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE',
  'IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE',
  'GB','NO','IS','LI','CH', // UK, EEA non-EU, Switzerland
]);

export async function onRequest({ request, next }) {
  const response = await next();
  const country = request.cf?.country ?? '';
  const value = EU_COUNTRIES.has(country) ? 'required' : 'not_required';
  const newResponse = new Response(response.body, response);
  newResponse.headers.append(
    'Set-Cookie',
    `geo_consent=${value}; Path=/; SameSite=Lax; Max-Age=86400; Secure`,
  );
  return newResponse;
}
