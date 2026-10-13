# Brandväggen

Ett litet webbläsarspel som demoapp för Git, GitHub, CI/CD och Docker.
Du styr regionens brandvägg och stoppar nätfiske, skadekod, DDoS, ransomware och zero-day-attacker innan de når Växjö sjukhus, Ljungby lasarett, vårdcentralerna och de andra noderna.

## Spela

| Kontroll | Mus | Mobil | Tangentbord |
|---|---|---|---|
| Styr brandväggen | Flytta musen | Dra med fingret | Pilar eller A/D |
| Puls (rensar nära hot) | Högerklick | Dubbeltryck | Mellanslag |

Fånga **MFA** (bredare brandvägg), **Patch** (rensar alla hot) och **Backup** (+25 integritet) med brandväggen.

## Köra lokalt

Utan installation: öppna `app/index.html` i webbläsaren.

Med Docker:

```bash
docker build -t brandvaggen .
docker run --rm -p 8080:80 brandvaggen
# öppna http://localhost:8080
```

Tester (kräver Node 20, inga paket behövs):

```bash
node --test tests/*.test.js
```

## Struktur

```
app/
  config.js   Inställningar och hot. Filen att ändra i under demon.
  logic.js    Testbar spellogik
  game.js     Grafik, ljud och inmatning
  index.html, style.css
tests/        Automatiska tester som körs vid varje pull request
Dockerfile    nginx som serverar spelet
.github/workflows/ci-cd.yml   Testa, bygga image och driftsätta
```

## Flödet

1. **Pull request:** tester körs och Docker-imagen byggs (men publiceras inte).
2. **Merge till main:** tester, imagen publiceras i GitHub Container Registry och spelet driftsätts till GitHub Pages.
3. Byggnumret (commit-id) syns nere till vänster i spelet, så det går att se exakt vilken ändring som är ute.

## Engångsinställningar i GitHub

1. **Settings → Pages → Source:** välj *GitHub Actions*.
2. **Settings → Branches → Add rule** för `main`: kräv pull request, minst ett godkännande och att statuskontrollen *Tester* är grön.
3. Om repot ligger i en organisation: kontrollera att Pages och GitHub Packages är tillåtna. Pages för privata repon kräver GitHub Enterprise, och organisationen kan ha begränsat vem som får se sidan.

Se `DEMO.md` för manuset till live-demon.
