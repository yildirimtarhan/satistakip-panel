export default function tahsilatMakbuzuTemplate({
  title,
  date,
  cari,
  amount,
  method,
  note,
  docId,
  company,
}) {
  const firmaAdi = company?.firmaAdi || "Firma Adı";
  const yetkili = company?.yetkili || "";
  const telefon = company?.telefon || "";
  const eposta = company?.eposta || "";
  const web = company?.web || "";
  const vergiDairesi = company?.vergiDairesi || "";
  const vergiNo = company?.vergiNo || "";
  const adres = company?.adres || "";
  const logo = company?.logo || "";

  // ✅ Logo URL ise göster (base64 ise istersen ayrıca ayarlarız)
  const logoHtml =
    logo && (logo.startsWith("http://") || logo.startsWith("https://"))
      ? `<img src="${logo}" style="height:50px;object-fit:contain;" />`
      : "";

  return `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');

      * { box-sizing: border-box; }
      body {
        font-family: Roboto, Arial, sans-serif;
        padding: 40px;
        color: #111;
      }

      .top {
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:20px;
        margin-bottom: 18px;
      }

      .company {
        flex: 1;
      }

      .company-title {
        font-size: 16px;
        font-weight: 700;
        margin-bottom: 4px;
      }

      .company-line {
        font-size: 12px;
        color: #374151;
        margin: 2px 0;
      }

      .doc {
        text-align:right;
        font-size: 12px;
        color: #111;
        min-width: 180px;
      }

      .doc small {
        display:block;
        color:#6b7280;
        margin-top:3px;
      }

      .divider {
        height: 1px;
        background: #e5e7eb;
        margin: 12px 0 22px;
      }

      .title {
        text-align:center;
        font-size: 18px;
        font-weight: 700;
        letter-spacing: 2px;
        margin: 10px 0 20px;
      }

      .box {
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 18px;
      }

      .row {
        display:flex;
        justify-content:space-between;
        gap: 15px;
        margin: 10px 0;
        font-size: 13px;
      }

      .label {
        color: #6b7280;
        width: 140px;
      }

      .value {
        flex: 1;
        font-weight: 500;
        color:#111827;
      }

      .amount {
        font-size: 20px;
        font-weight: 700;
      }

      .footer {
        margin-top: 40px;
        display:flex;
        justify-content:space-between;
        gap: 30px;
      }

      .sign {
        flex:1;
        border-top: 1px solid #e5e7eb;
        padding-top: 10px;
        font-size: 13px;
        color: #374151;
      }

      .muted {
        color:#6b7280;
      }

      .logo {
        margin-bottom: 6px;
      }
    </style>
  </head>
  <body>

    <div class="top">
      <div class="company">
        ${logoHtml ? `<div class="logo">${logoHtml}</div>` : ""}
        <div class="company-title">${firmaAdi}</div>

        ${
          yetkili
            ? `<div class="company-line"><span class="muted">Yetkili:</span> ${yetkili}</div>`
            : ""
        }

        ${
          vergiDairesi || vergiNo
            ? `<div class="company-line"><span class="muted">VD:</span> ${vergiDairesi} <span class="muted">| VNo:</span> ${vergiNo}</div>`
            : ""
        }

        ${
          telefon || eposta
            ? `<div class="company-line">${telefon}${eposta ? " | " + eposta : ""}</div>`
            : ""
        }

        ${web ? `<div class="company-line">${web}</div>` : ""}
        ${adres ? `<div class="company-line">${adres}</div>` : ""}
      </div>

      <div class="doc">
        <div><b>Belge ID:</b> ${docId}</div>
        <small><b>Tarih:</b> ${date}</small>
      </div>
    </div>

    <div class="divider"></div>

    <div class="title">${title}</div>

    <div class="box">
      <div class="row">
        <div class="label">Cari</div>
        <div class="value">${cari}</div>
      </div>

      <div class="row">
        <div class="label">Yöntem</div>
        <div class="value">${method}</div>
      </div>

      <div class="row">
        <div class="label">Tutar</div>
        <div class="value amount">${amount} TRY</div>
      </div>

      ${
        note
          ? `<div class="row">
              <div class="label">Not</div>
              <div class="value">${note}</div>
            </div>`
          : ""
      }
    </div>

    <div class="footer">
      <div class="sign">Teslim Eden</div>
      <div class="sign">Teslim Alan</div>
    </div>

  </body>
  </html>
  `;
}
