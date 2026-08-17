import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-vortex-crm';

async function test() {
  const token = jwt.sign(
    { id: '742e71aa-3848-446e-9da3-dde858daa969', email: 'admin@vortexcubes.com', role: 'ADMIN' },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  try {
    const res = await fetch('http://localhost:5000/api/activity/idle-requests', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    console.log('Success:', data);
  } catch (err: any) {
    console.error('Error:', err);
  }
}

test();
