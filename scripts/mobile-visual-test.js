const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const files = {
  html: fs.readFileSync(path.join(root, "index.html"), "utf8"),
  adminHtml: fs.readFileSync(path.join(root, "admin.html"), "utf8"),
  termsHtml: fs.readFileSync(path.join(root, "termos.html"), "utf8"),
  css: fs.readFileSync(path.join(root, "styles.css"), "utf8"),
};

const checks = [];

function record(name, ok, detail) {
  checks.push({ name, ok, detail });
}

function includesAll(text, values) {
  return values.every((value) => text.includes(value));
}

record("viewport configured", includesAll(files.html, ['name="viewport"', "width=device-width"]) && includesAll(files.adminHtml, ['name="viewport"', "width=device-width"]), "public/admin viewport");
record("mobile breakpoint exists", files.css.includes("@media (max-width: 620px)") && files.css.includes("@media (max-width: 380px)"), "620px and 380px");
record("public mobile grids collapse", includesAll(files.css, [".services-grid", ".privacy-grid", ".lookup-form", "grid-template-columns: 1fr"]), "client layout");
record("admin mobile layout collapses", includesAll(files.css, [".admin-workspace", ".admin-panel", ".monitor-panel", ".appointment-card"]), "admin layout");
record("mobile tap targets preserved", includesAll(files.css, ["min-height: 48px", ".secondary-button", ".ghost-button"]), "inputs/buttons");
record("no horizontal body overflow", files.css.includes("overflow-x: hidden"), "body overflow guard");
record("terms readable on mobile", includesAll(files.termsHtml, ["terms-shell", "terms-card"]) && files.css.includes(".terms-shell"), "terms page");
record("critical client flow visible", includesAll(files.html, ["Agendamento", "Consultar agendamento", "Fale com Jacinta Santos", "Sinal de 20%"]), "client sections");

console.table(checks);

if (checks.some((check) => !check.ok)) {
  process.exitCode = 1;
}
