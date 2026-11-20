
const app = document.getElementById("app");

// Ausschliesslich erfundene Testdaten
// Studiostammdaten
const TEST_STUDIOS = [
    {
        id: 1,
        ort: "Beispielort",
        adresse: "Musterstrasse 10",
        etablissement: "Studio Beispiel",
        gebaeude: "Gebäude A",
        kontakt: "Testkontakt",
        bemerkung: "Keine Bemerkung"
    },
    {
        id: 2,
        ort: "Musterstadt",
        adresse: "Bahnhofstrasse 5",
        etablissement: "Studio Muster",
        gebaeude: "Gebäude B",
        kontakt: "Testkontakt",
        bemerkung: ""
    }
];

let studios = JSON.parse(
    localStorage.getItem("studioStammdaten") ||
    JSON.stringify(TEST_STUDIOS)
);

// Originale Excel-Arbeitsmappe für den Export behalten
let excelArbeitsmappe = null;
let excelTabellenName = null;
let excelDateiDaten = null;

// Kontrollhistorie lokal auf dem Gerät speichern
const SPEICHER_SCHLUESSEL = "studioKontrollHistorie";

let kontrollHistorie = JSON.parse(
    localStorage.getItem(SPEICHER_SCHLUESSEL) || "{}"
);

// Mitarbeiterkürzel einmalig speichern
let mitarbeiter = localStorage.getItem("mitarbeiter");

function startseite() {
    if (!mitarbeiter) {
        app.innerHTML = `
            <section>
                <h2>Willkommen</h2>
                <p>Bitte gib dein Mitarbeiterkürzel ein.</p>

                <form id="mitarbeiterForm">
                    <input id="kuerzel"
                        placeholder="Mitarbeiterkürzel"
                        maxlength="10"
                        required>
                    <button type="submit">Speichern</button>
                </form>
            </section>
        `;

        document.getElementById("mitarbeiterForm")
            .addEventListener("submit", function(e) {
                e.preventDefault();

                mitarbeiter = document.getElementById("kuerzel")
                    .value.trim().toUpperCase();

                if (!mitarbeiter) return;

                localStorage.setItem("mitarbeiter", mitarbeiter);
                startseite();
            });

        return;
    }

app.innerHTML = `
    <section>
        <h2>Studio-Kontrolle</h2>
        <p>Mitarbeiter: <strong>${sicher(mitarbeiter)}</strong></p>
        <button id="suche">Studios suchen</button>

        <button id="import">
            Excel-Datei importieren
        </button>

        <input type="file"
            id="excelDatei"
            accept=".xlsx,.xls"
            style="display:none;">

        <button id="export">
            Kontrollen exportieren
        </button>

        <button id="zusammenfuehren">
            Kontrollen zusammenführen
        </button>

    </section>
`;

    document.getElementById("suche")
        .addEventListener("click", studiosuche);
    document.getElementById("import")
        .addEventListener("click", () => {
        document.getElementById("excelDatei").click();
    });

    document.getElementById("excelDatei")
        .addEventListener("change", excelImportieren);
    document.getElementById("export")
        .addEventListener("click", kontrollenExportieren);
    document.getElementById("zusammenfuehren")
    .addEventListener("click", kontrollenZusammenfuehren);
}

// Suche nach Studios
function studiosuche() {
    app.innerHTML = `
        <section>
            <h2>Studios suchen</h2>

            <input id="suchfeld"
                placeholder="Ort, Adresse oder Studio">

            <div id="suchergebnisse"></div>

            <button id="zurueck">Zurück</button>
        </section>
    `;

    document.getElementById("suchfeld")
        .addEventListener("input", ergebnisse);

    document.getElementById("zurueck")
        .addEventListener("click", startseite);

    ergebnisse();
}

function ergebnisse() {
    const suche = document.getElementById("suchfeld")
        .value.toLowerCase();

    const treffer = studios.filter(studio =>
        Object.values(studio).some(wert =>
            String(wert).toLowerCase().includes(suche)
        )
    );

    const liste = document.getElementById("suchergebnisse");
    liste.innerHTML = "";

    treffer.forEach(studio => {
        const button = document.createElement("button");
        button.textContent =
            studio.etablissement + " – " + studio.ort;

        button.addEventListener("click", () =>
            studioAnzeigen(studio.id)
        );

        liste.appendChild(button);
    });

    if (treffer.length === 0) {
        liste.textContent = "Keine Studios gefunden.";
    }
}

// Studio und Kontrollhistorie anzeigen
function studioAnzeigen(id) {
    const studio = studios.find(s => s.id === id);
    const kontrollListe = kontrollHistorie[id] || [];

    const sortiert = [...kontrollListe].sort((a, b) =>
        b.zeitpunkt.localeCompare(a.zeitpunkt)
    );

    app.innerHTML = `
        <section>
            <h2>${sicher(studio.etablissement)}</h2>

            <p><strong>Ort:</strong> ${sicher(studio.ort)}</p>
            <p><strong>Adresse:</strong> ${sicher(studio.adresse)}</p>
            <p><strong>Gebäude:</strong> ${sicher(studio.gebaeude)}</p>
            <p><strong>Kontakt:</strong> ${sicher(studio.kontakt)}</p>
            <p><strong>Bemerkung:</strong> ${sicher(studio.bemerkung)}</p>

            <h3>Kontrollhistorie</h3>
            <div id="historie"></div>

            <button id="neueKontrolle">
                Neue Kontrolle erfassen
            </button>

            <button id="zurueck">Zurück zur Suche</button>
        </section>
    `;

    const historie = document.getElementById("historie");

    if (sortiert.length === 0) {
        historie.textContent = "Noch keine Kontrollen vorhanden.";
    }

    sortiert.forEach(k => {
        const eintrag = document.createElement("p");
        eintrag.textContent =
            `${k.datum} | ${k.uhrzeit} | ${k.mitarbeiter} | ${k.personen} Personen`;
        historie.appendChild(eintrag);

        const details = document.createElement("p");
        details.textContent = k.feststellungen;
        historie.appendChild(details);
    });

    document.getElementById("neueKontrolle")
        .addEventListener("click", () => kontrolleErfassen(id));

    document.getElementById("zurueck")
        .addEventListener("click", studiosuche);
}

// Neue Kontrolle erfassen
function kontrolleErfassen(id) {
    const jetzt = new Date();
    const lokal = new Date(
        jetzt.getTime() - jetzt.getTimezoneOffset() * 60000
    ).toISOString().slice(0, 16);

    app.innerHTML = `
        <section>
            <h2>Neue Kontrolle</h2>

            <form id="kontrollForm">

                <label>Datum und Uhrzeit</label>
                <input type="datetime-local"
                    id="zeitpunkt"
                    value="${lokal}"
                    required>

                <label>Mitarbeiterkürzel</label>
                <input value="${sicher(mitarbeiter)}" disabled>

                <label>Kontrollierte Personen</label>
                <input type="number" id="personen"
                    min="0" step="1" value="0" required>

                <h3>Feststellungen</h3>

                ${[
                    "Meldeverstoss",
                    "Festnahme",
                    "RIPOL-Ausschreibung",
                    "Bericht allgemein",
                    "Aufenthaltsnachforschung"
                ].map(name => `
                    <label>${name}</label>
                    <input type="number"
                        class="feststellung"
                        data-name="${name}"
                        min="0" step="1" value="0">
                `).join("")}

                <label>Weitere Feststellungen</label>
                <textarea id="weitere"></textarea>

                <button type="submit">Kontrolle speichern</button>
                <button type="button" id="abbrechen">
                    Abbrechen
                </button>
            </form>
        </section>
    `;

    document.getElementById("abbrechen")
        .addEventListener("click", () => studioAnzeigen(id));

    document.getElementById("kontrollForm")
        .addEventListener("submit", function(e) {
            e.preventDefault();

            const zeitpunkt =
                document.getElementById("zeitpunkt").value;

            const zahlen = [
                ...document.querySelectorAll(".feststellung")
            ];

            const feststellungen = zahlen.map(input =>
                input.dataset.name + ": " + input.value
            ).join(" | ");

            const weitere =
                document.getElementById("weitere").value.trim();

            const k = {
                id: crypto.randomUUID(),
                zeitpunkt,
                datum: zeitpunkt.slice(0, 10),
                uhrzeit: zeitpunkt.slice(11, 16),
                mitarbeiter,
                personen: document.getElementById("personen").value,
                feststellungen,
                weitere,
                exportiert: false
            };

            if (weitere) {
                k.feststellungen += " | Weitere: " + weitere;
            }

            if (!kontrollHistorie[id]) {
                kontrollHistorie[id] = [];
            }

            kontrollHistorie[id].push(k);

            localStorage.setItem(
                SPEICHER_SCHLUESSEL,
                JSON.stringify(kontrollHistorie)
            );

            studioAnzeigen(id);
        });
}
// Excel-Datei importieren
function excelImportieren(e) {
    const datei = e.target.files[0];

    if (!datei) return;

    const leser = new FileReader();

    leser.onload = function(event) {
        try {
            excelDateiDaten = event.target.result.slice(0);
            
            excelArbeitsmappe = XLSX.read(
                event.target.result,
                { type: "array" }
            );

            excelTabellenName = excelArbeitsmappe.SheetNames[0];
            console.log("Excel-Arbeitsmappe:", excelArbeitsmappe);
            console.log("Excel-Tabellenname:", excelTabellenName);

            if (!excelTabellenName) {
                alert("Kein Tabellenblatt gefunden.");
                return;
            }

            const tabelle = XLSX.utils.sheet_to_json(
                excelArbeitsmappe.Sheets[excelTabellenName],
                {
                    header: 1,
                    defval: "",
                    raw: false
                }
            );

            const importierteStudios = tabelle
                .slice(1)
                .map((zeile, index) => ({
                    id: "excel-" + (index + 2) + "-" +
                    String(zeile[0] || "").trim() + "-" +
                    String(zeile[1] || "").trim(),
                    ort: String(zeile[0] || "").trim(),
                    adresse: String(zeile[1] || "").trim(),
                    etablissement: String(zeile[2] || "").trim(),
                    gebaeude: String(zeile[3] || "").trim(),
                    kontrollen: String(zeile[4] || ""),
                    kontakt: String(zeile[5] || "").trim(),
                    bemerkung: String(zeile[6] || "").trim()
                }))
                .filter(studio =>
                    studio.ort ||
                    studio.adresse ||
                    studio.etablissement ||
                    studio.gebaeude ||
                    studio.kontrollen ||
                    studio.kontakt ||
                    studio.bemerkung
                );

            if (importierteStudios.length === 0) {
                alert("Keine Studios gefunden.");
                return;
            }

            studios = importierteStudios;

            localStorage.setItem(
                "studioStammdaten",
                JSON.stringify(studios)
            );

            alert(
                importierteStudios.length +
                " Studios erfolgreich importiert."
            );

            startseite();

        } catch (fehler) {
            alert("Die Excel-Datei konnte nicht gelesen werden.");
            console.error(fehler);
        } finally {
            e.target.value = "";
        }
    };

    leser.onerror = function() {
        alert("Die Datei konnte nicht geöffnet werden.");
    };

    leser.readAsArrayBuffer(datei);
}

// Kontrollen in die importierte Original-Excel-Datei schreiben

async function kontrollenExportieren() {
if (!window.XLSX || typeof ExcelJS === "undefined") {
    alert("Eine benötigte Excel-Bibliothek wurde nicht geladen.");
    return;
}

if (!excelDateiDaten) {
    alert("Bitte zuerst die Excel-Datei importieren.");
    return;
}

    if (!excelArbeitsmappe || !excelTabellenName) {
        alert("Bitte zuerst die Excel-Datei importieren.");
        return;
    }

const neueArbeitsmappe = new ExcelJS.Workbook();

await neueArbeitsmappe.xlsx.load(excelDateiDaten);

const neuesArbeitsblatt =
    neueArbeitsmappe.getWorksheet(excelTabellenName);

let idArbeitsblatt =
    neueArbeitsmappe.getWorksheet("_KontrollIDs");

if (!idArbeitsblatt) {
    idArbeitsblatt =
        neueArbeitsmappe.addWorksheet("_KontrollIDs");

    idArbeitsblatt.state = "veryHidden";

    idArbeitsblatt.addRow([
        "Kontroll-ID",
        "Excel-Zeile",
        "Kontrolldatum",
        "Mitarbeiter",
        "Kontrolltext"
    ]);
}

if (!neuesArbeitsblatt) {
    alert("Das Excel-Tabellenblatt wurde nicht gefunden.");
    return;
}
    let anzahlExportiert = 0;

    const exportierteKontrollen = [];

    studios.forEach((studio, index) => {
        const kontrollen = kontrollHistorie[studio.id] || [];

        const nichtExportiert = kontrollen.filter(
            k => k.exportiert !== true
        );

        if (nichtExportiert.length === 0) return;

const studioIndex = studios.findIndex(
    s => s.id === studio.id
);

if (studioIndex === -1) return;

const zelle = neuesArbeitsblatt.getCell(
    studioIndex + 2,
    5
);

const alteKontrollen =
    zelle.value == null ? "" : String(zelle.value);

        const neueEintraege = nichtExportiert
            .sort((a, b) =>
                a.zeitpunkt.localeCompare(b.zeitpunkt)
            )
            .map(k => {
                const datum = k.datum
                    ? k.datum.split("-").reverse().join(".")
                    : "";

                return [
                    datum,
                    k.uhrzeit + " Uhr",
                    k.mitarbeiter,
                    k.personen + " Personen kontrolliert",
                    k.feststellungen,
                    k.weitere || ""
                ].filter(Boolean).join(", ");
            });

zelle.value = [
    alteKontrollen,
    ...neueEintraege
].filter(Boolean).join("\n");

        anzahlExportiert += nichtExportiert.length;
        exportierteKontrollen.push(...nichtExportiert);
nichtExportiert.forEach(k => {
    const datum = k.datum
        ? k.datum.split("-").reverse().join(".")
        : "";

    const kontrolltext = [
        datum,
        k.uhrzeit + " Uhr",
        k.mitarbeiter,
        k.personen + " Personen kontrolliert",
        k.feststellungen,
        k.weitere || ""
    ].filter(Boolean).join(", ");

    idArbeitsblatt.addRow([
        k.id,
        studioIndex + 2,
        k.datum || "",
        k.mitarbeiter || "",
        kontrolltext
    ]);
});

});
    // Arbeitsmappe erstellen

    const jetzt = new Date();

    const zeitstempel =
        jetzt.getFullYear() + "-" +
        String(jetzt.getMonth() + 1).padStart(2, "0") + "-" +
        String(jetzt.getDate()).padStart(2, "0") + "-" +
        String(jetzt.getHours()).padStart(2, "0") +
        String(jetzt.getMinutes()).padStart(2, "0");

    const dateiname =
        "Studio-Kontrolle-Export-" + zeitstempel + ".xlsx";

if (exportierteKontrollen.length === 0) {
    alert("Es gibt keine neuen Kontrollen zum Exportieren.");
    return;
}

try {
    const buffer = await neueArbeitsmappe.xlsx.writeBuffer();

    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = dateiname;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

} catch (fehler) {
    alert("Export fehlgeschlagen.");
    console.error(fehler);
    return;
}
    
alert(
    anzahlExportiert +
    " Kontrollen wurden exportiert."
);

exportBestaetigen(exportierteKontrollen);
}


function exportBestaetigen(exportierteKontrollen) {
    const bestaetigt = confirm(
        "Wurde die Excel-Datei erfolgreich heruntergeladen?\n\n" +
        "Möchtest du " + exportierteKontrollen.length +
        " Kontrollen als exportiert markieren?"
    );

    if (!bestaetigt) {
        alert("Die Kontrollen bleiben als nicht exportiert gespeichert.");
        return;
    }

    exportierteKontrollen.forEach(k => {
        k.exportiert = true;
    });

    localStorage.setItem(
        SPEICHER_SCHLUESSEL,
        JSON.stringify(kontrollHistorie)
    );

    alert("Die Kontrollen wurden als exportiert markiert.");
}


// Dynamische Texte sicher anzeigen
function sicher(text) {
    return String(text ?? "").replace(/[&<>"']/g, zeichen => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[zeichen]);
}

async function kontrollenZusammenfuehren() {
    const dateiAuswahl = document.createElement("input");

    dateiAuswahl.type = "file";
    dateiAuswahl.accept = ".xlsx";
    dateiAuswahl.multiple = true;

    dateiAuswahl.addEventListener("change", async function() {
        const dateien = Array.from(dateiAuswahl.files);

        if (dateien.length !== 2) {
            alert("Bitte genau zwei Excel-Dateien auswählen.");
            return;
        }

        try {
            let ergebnis = "";

            for (const datei of dateien) {
                const dateiDaten = await datei.arrayBuffer();

                const arbeitsmappe = new ExcelJS.Workbook();
                await arbeitsmappe.xlsx.load(dateiDaten);

                const idArbeitsblatt =
                    arbeitsmappe.getWorksheet("_KontrollIDs");

                if (!idArbeitsblatt) {
                    throw new Error(
                        "Das Tabellenblatt _KontrollIDs fehlt in " +
                        datei.name
                    );
                }

                let anzahlIDs = 0;

                idArbeitsblatt.eachRow(function(zeile, zeilenNummer) {
                    if (
                        zeilenNummer > 1 &&
                        zeile.getCell(1).value
                    ) {
                        anzahlIDs++;
                    }
                });

                ergebnis +=
                    datei.name + ": " +
                    anzahlIDs + " Kontroll-IDs gefunden\n";
            }

            alert(ergebnis);

        } catch (fehler) {
            console.error(fehler);
            alert("Fehler: " + fehler.message);
        }
    });

    dateiAuswahl.click();
}
// Anwendung starten
startseite();
