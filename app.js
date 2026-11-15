
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
                zeitpunkt,
                datum: zeitpunkt.slice(0, 10),
                uhrzeit: zeitpunkt.slice(11, 16),
                mitarbeiter,
                personen: document.getElementById("personen").value,
                feststellungen,
                weitere
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
// Excel-Datei importieren
function excelImportieren(e) {
    const datei = e.target.files[0];

    if (!datei) return;

    const leser = new FileReader();

    leser.onload = function(event) {
        try {
            const arbeitsmappe = XLSX.read(
                event.target.result,
                { type: "array" }
            );

            const tabellenName = arbeitsmappe.SheetNames[0];

            if (!tabellenName) {
                alert("Kein Tabellenblatt gefunden.");
                return;
            }

            const tabelle = XLSX.utils.sheet_to_json(
                arbeitsmappe.Sheets[tabellenName],
                {
                    header: 1,
                    defval: "",
                    raw: false
                }
            );

            const importierteStudios = tabelle
                .slice(1)
                .map((zeile, index) => ({
                    id: "excel-" + (index + 2),
                    ort: String(zeile[0] || "").trim(),
                    adresse: String(zeile[1] || "").trim(),
                    etablissement: String(zeile[2] || "").trim(),
                    gebaeude: String(zeile[3] || "").trim(),
                    kontakt: String(zeile[5] || "").trim(),
                    bemerkung: String(zeile[6] || "").trim()
                }))
                .filter(studio =>
                    studio.ort ||
                    studio.adresse ||
                    studio.etablissement ||
                    studio.gebaeude ||
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
// Kontrollen als Excel-Datei exportieren
function kontrollenExportieren() {
    if (!window.XLSX) {
        alert("Die Excel-Bibliothek wurde nicht geladen.");
        return;
    }

    const daten = [
        [
            "Ort",
            "Adresse",
            "Etablissement",
            "Gebäude",
            "Kontrollen",
            "Kontakt",
            "Bemerkung"
        ]
    ];

    studios.forEach(studio => {
        const alteKontrollen = studio.kontrollen || "";
        const neueKontrollen = kontrollHistorie[studio.id] || [];

        const sortiert = [...neueKontrollen].sort((a, b) =>
            b.zeitpunkt.localeCompare(a.zeitpunkt)
        );

        const neueEintraege = sortiert.map(k => {
            const feststellungen = [];

            if (Number(k.meldeverstoss) > 0) {
                feststellungen.push(k.meldeverstoss + "x Meldeverstoss");
            }
            if (Number(k.festnahme) > 0) {
                feststellungen.push(k.festnahme + "x Festnahme");
            }
            if (Number(k.ripol) > 0) {
                feststellungen.push(k.ripol + "x RIPOL-Ausschreibung");
            }
            if (Number(k.bericht) > 0) {
                feststellungen.push(k.bericht + "x Bericht allgemein");
            }
            if (Number(k.aufenthalt) > 0) {
                feststellungen.push(k.aufenthalt + "x Aufenthaltsnachforschung");
            }
            if (k.weitere) {
                feststellungen.push(k.weitere);
            }

            const beschreibung = feststellungen.length > 0
                ? feststellungen.join(", ")
                : "alles in Ordnung";

            return `${k.datum}, ${k.uhrzeit} Uhr, ${k.personen} Personen kontrolliert, ${beschreibung}`;
        });

        const alleKontrollen = [
            ...neueEintraege,
            alteKontrollen
        ].filter(eintrag => eintrag && eintrag.trim() !== "").join("\n");

        daten.push([
            studio.ort || "",
            studio.adresse || "",
            studio.etablissement || "",
            studio.gebaeude || "",
            alleKontrollen,
            studio.kontakt || "",
            studio.bemerkung || ""
        ]);
    });

    const arbeitsmappe = XLSX.utils.book_new();
    const tabelle = XLSX.utils.aoa_to_sheet(daten);

    XLSX.utils.book_append_sheet(
        arbeitsmappe,
        tabelle,
        "Studios"
    );

    XLSX.writeFile(
        arbeitsmappe,
        "Studio-Kontrolle.xlsx"
    );
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

// Anwendung starten
startseite();
