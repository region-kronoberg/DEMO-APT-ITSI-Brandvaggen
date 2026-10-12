# Demomanus, cirka 7 minuter

## Före mötet

- [ ] Repot finns i GitHub och flödet har körts grönt minst en gång
- [ ] GitHub Pages är på och spelet går att öppna på mobilen
- [ ] Branch protection på `main`: pull request, ett godkännande, *Tester* måste vara grön
- [ ] En kollega är beredd att godkänna din pull request (eller en andra inloggning)
- [ ] Copilot fungerar i VS Code
- [ ] En skärminspelning av hela demon ligger redo som reserv

## 1. Visa spelet (1 min)

Öppna Pages-adressen på projektorn. Startskärmen visar en QR-kod: be publiken skanna den och spela i mobilen.
Peka på byggnumret nere till vänster: *"Det här är commit `abc1234`. Kom ihåg det."*

## 2. Gör en ändring med Copilot (1 min)

Öppna `app/config.js` i VS Code. Be Copilot:

> Lägg till ett nytt hot "Läckt lösenord" i THREATS, orange, ikon key, 2 hp, från våg 2.

Förväntat resultat, ungefär:

```js
{ id: 'losenord', name: 'Läckt lösenord', color: '#FF9F1C', speed: 85, hp: 2, damage: 10, points: 250, weight: 2, fromWave: 2, icon: 'key' },
```

## 3. Försök pusha direkt till main (30 s)

```bash
git commit -am "Nytt hot: läckt lösenord"
git push origin main
```

Pushen nekas. *"Ingen, inte ens jag, kan ändra i produktion utan granskning."*

## 4. Pull request (1 min)

```bash
git switch -c nytt-hot
git push -u origin nytt-hot
```

Skapa en pull request i GitHub. Visa skillnaden rad för rad och att *Tester* och *Docker-image* startar automatiskt.

## 5. Låt testerna stoppa ett fel (1 min, valfritt men effektfullt)

Ändra `SHIELD_ARC_DEG: 70` till `360` i samma gren och pusha. Testet blir rött med meddelandet
*"SHIELD_ARC_DEG är 360, ska vara mellan 20 och 180"*. Ändra tillbaka och se det bli grönt.

## 6. Granska och slå ihop (1 min)

Kollegan godkänner. Klicka *Merge*. Öppna fliken **Actions** och visa hur Pages-jobbet driftsätter.

## 7. Se ändringen live (1 min)

Ladda om spelet. Byggnumret har ändrats, och *Läckt lösenord* finns bland hoten på startskärmen. Publiken ser det i sina mobiler.

## 8. Backa (30 s)

I den sammanslagna pull requesten: klicka **Revert**. *"Om något går fel är vi tillbaka på förra versionen på en minut."*

## Om något strular

| Problem | Gör så här |
|---|---|
| Nätet eller inloggningen krånglar | Byt till skärminspelningen |
| Pages-jobbet dröjer | Visa Docker-jobbet och berätta under tiden |
| Copilot svarar konstigt | Klistra in raden ovan själv |
