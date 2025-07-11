export async function findWanIp(url = 'https://checkip.amazonaws.com') {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unexpected response: ${response.status} ${response.statusText}`);
  }
  const wanIp = (await response.text()).trim();
  return wanIp;
}
