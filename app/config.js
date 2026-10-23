// Spelets inställningar. Det här är filen att ändra i under demon.
// Ändra ett värde, skapa en pull request och se flödet bygga, testa och driftsätta.

const CONFIG = {
  VERSION: '1.0',
  BUILD: 'lokal', // ersätts med commit-id av GitHub Actions

  TITLE: 'Brandväggen',
  SUBTITLE: 'Försvara Region Kronobergs nätverk',
  TEAM: 'IT Säkerhet och infrastruktur',

  // Brandväggen
  SHIELD_ARC_DEG: 70,      // hur bred brandväggen är, i grader
  SHIELD_KEY_SPEED: 4.2,   // rotationshastighet med tangentbord, radianer per sekund

  // Spelets tempo
  START_INTEGRITY: 100,    // nätverkets hälsa vid start
  WAVE_SECONDS: 22,        // längd på varje våg
  SPAWN_INTERVAL: 1.5,     // sekunder mellan hot i våg 1
  SPAWN_SPEEDUP: 0.88,     // varje våg multiplicerar intervallet med detta
  SPEED_PER_WAVE: 0.07,    // hoten blir 7 procent snabbare per våg

  // Pulsen (mellanslag eller dubbeltryck)
  PULSE_COOLDOWN: 12,      // sekunder
  PULSE_RADIUS: 0.55,      // andel av spelplanen

  // Det som ska skyddas
  NODES: [
    { name: 'Växjö sjukhus', short: 'VS' },
    { name: 'Ljungby sjukhus', short: 'LS' },
    { name: 'Vårdcentraler', short: 'VC' },
    { name: '1177', short: '1177' },
    { name: 'Folktandvården', short: 'FTV' },
    { name: 'Regionhuset', short: 'RH' },
  ],

  // Hoten. Lägg till ett nytt hot här för att visa en ändring live.
  THREATS: [
    { id: 'phishing',   name: 'Nätfiske',   color: '#FF4FA3', speed: 70,  hp: 1, damage: 6,  points: 100, weight: 5, fromWave: 1, icon: 'mail' },
    { id: 'malware',    name: 'Skadekod',   color: '#FFD300', speed: 95,  hp: 1, damage: 8,  points: 150, weight: 3, fromWave: 2, icon: 'bug' },
    { id: 'ddos',       name: 'DDoS',       color: '#36C5F0', speed: 150, hp: 1, damage: 2,  points: 40,  weight: 2, fromWave: 3, icon: 'dot', swarm: 6 },
    { id: 'ransomware', name: 'Ransomware', color: '#FF5A3C', speed: 52,  hp: 3, damage: 20, points: 400, weight: 2, fromWave: 4, icon: 'lock' },
    { id: 'zeroday',    name: 'Zero-day',   color: '#B98CFF', speed: 115, hp: 1, damage: 15, points: 500, weight: 1, fromWave: 5, icon: 'skull', zigzag: true },
  ],

  // Förstärkningar som fångas med brandväggen
  POWERUPS: [
    { id: 'mfa',    name: 'MFA',    desc: 'Bredare brandvägg', color: '#3DDC84', duration: 8 },
    { id: 'patch',  name: 'Patch',  desc: 'Rensar alla hot',   color: '#FFFFFF' },
    { id: 'backup', name: 'Backup', desc: '+25 integritet',    color: '#22E0C0' },
  ],
  POWERUP_CHANCE: 0.07,
};

if (typeof module !== 'undefined') module.exports = CONFIG;
