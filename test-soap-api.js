async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/soap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'C1001ヤマダさん、右下6番のインプラントの土台を立てました。次回型取り予定です。',
        outputLength: 'short'
      })
    });
    console.log('STATUS:', res.status);
    const data = await res.json();
    console.log('DATA:', data);
  } catch (e) {
    console.error('ERROR:', e.message);
  }
}
test();
