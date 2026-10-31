import 'dotenv/config';

async function seedDemo() {
  if (process.env.DEMO_MODE !== 'true') throw new Error('Refusing to seed: DEMO_MODE must be explicitly true.');
  const email = process.env.DEMO_ADMIN_EMAIL?.trim();
  const password = process.env.DEMO_ADMIN_PASSWORD;
  if (!email || !password) throw new Error('Set DEMO_ADMIN_EMAIL and DEMO_ADMIN_PASSWORD in the server environment.');
  const baseUrl = (process.env.SERVER_BASE_URL || `http://127.0.0.1:${process.env.PORT || 5000}`).replace(/\/$/, '');

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!login.ok) throw new Error(`Demo admin login failed with HTTP ${login.status}. Ensure the demo server is running and demo admin credentials are configured.`);
  const loginBody = await login.json() as { data?: { token?: string; user?: { role?: string } } };
  if (!loginBody.data?.token || loginBody.data.user?.role !== 'admin') throw new Error('Configured demo account does not have the admin role.');

  const response = await fetch(`${baseUrl}/api/seed`, {
    method: 'POST', headers: { Authorization: `Bearer ${loginBody.data.token}` },
  });
  if (!response.ok) throw new Error(`Demo seed failed with HTTP ${response.status}.`);
  console.log('The running demo server has been reseeded with Bengaluru sample records.');
}

seedDemo().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Demo seeding failed.');
  process.exitCode = 1;
});
