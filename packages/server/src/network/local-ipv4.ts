import { networkInterfaces } from "node:os";

interface AddressCandidate {
  name: string;
  address: string;
  priority: number;
}

const VPN_INTERFACE =
  /tailscale|wireguard|wintun|tun\d|tap\d|vpn|zerotier|hamachi|nordlynx|openvpn|wg-|mesh|meta|virtualbox|vmware|hyper-v|loopback/i;

const ETHERNET_INTERFACE =
  /ethernet|eth\d|local area connection|gigabit|2\.5g|10g/i;

function isLinkLocal(ip: string): boolean {
  return ip.startsWith("169.254.");
}

/** Tailscale/CGNAT range 100.64.0.0/10 */
function isCgNatIp(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }
  return parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127;
}

function isVirtualInterface(name: string): boolean {
  return VPN_INTERFACE.test(name);
}

function isIpv4(family: string | number): boolean {
  return family === "IPv4" || family === 4;
}

function getInterfacePriority(name: string): number {
  if (ETHERNET_INTERFACE.test(name)) {
    return 0;
  }
  if (/wi-?fi|wlan|wireless/i.test(name)) {
    return 1;
  }
  if (isVirtualInterface(name)) {
    return 100;
  }
  return 50;
}

export function getLocalIpv4(): string {
  const interfaces = networkInterfaces();
  const candidates: AddressCandidate[] = [];

  for (const [name, entries] of Object.entries(interfaces)) {
    if (!entries || isVirtualInterface(name)) {
      continue;
    }

    for (const entry of entries) {
      if (!isIpv4(entry.family) || entry.internal) {
        continue;
      }
      if (isLinkLocal(entry.address)) {
        continue;
      }

      candidates.push({
        name,
        address: entry.address,
        priority: getInterfacePriority(name),
      });
    }
  }

  const withoutCgNat = candidates.filter(
    (candidate) => !isCgNatIp(candidate.address),
  );
  const pool = withoutCgNat.length > 0 ? withoutCgNat : candidates;

  pool.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return a.name.localeCompare(b.name);
  });

  return pool[0]?.address ?? "---";
}
