/**
 * GİB Standart E-Fatura XSLT Şablonu
 * GİB Logosu ve Firma Logosu ile
 */

const GIB_XSLT_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:inv="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
    xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
    xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
    exclude-result-prefixes="inv cac cbc">

    <xsl:output method="html" encoding="UTF-8" indent="yes"/>

    <xsl:template match="/">
        <html>
            <head>
                <meta charset="UTF-8"/>
                <title>E-Fatura</title>
                <style>
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        margin: 20px; 
                        font-size: 12px; 
                        line-height: 1.4;
                        color: #333;
                    }
                    .header { 
                        text-align: center; 
                        border-bottom: 3px solid #1e3a8a; 
                        padding-bottom: 15px; 
                        margin-bottom: 20px; 
                        position: relative;
                    }
                    .logo-table {
                        width: 100%;
                        margin-bottom: 15px;
                    }
                    .logo-table td {
                        width: 33%;
                        vertical-align: middle;
                        text-align: center;
                    }
                    .gib-imza-block {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 12px;
                    }
                    .company-logo-box {
                        width: 120px;
                        height: 80px;
                        border: 1px solid #cbd5e1;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto;
                        background: #f8fafc;
                        font-size: 10px;
                        color: #64748b;
                    }
                    .gib-logo-box {
                        width: 90px;
                        height: 90px;
                        margin: 0 auto;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .header h1 { 
                        margin: 10px 0 0; 
                        font-size: 26px; 
                        color: #1e3a8a;
                        text-transform: uppercase;
                        font-weight: bold;
                        letter-spacing: 2px;
                    }
                    .test-badge {
                        background: #dc2626;
                        color: white;
                        padding: 8px 25px;
                        border-radius: 20px;
                        font-size: 12px;
                        font-weight: bold;
                        display: inline-block;
                        margin-top: 10px;
                        border: 2px solid #991b1b;
                        text-transform: uppercase;
                    }
                    .section-title {
                        background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
                        color: white;
                        padding: 12px 15px;
                        font-weight: bold;
                        font-size: 13px;
                        margin: 20px 0 10px;
                        border-radius: 6px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    .info-table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-bottom: 15px; 
                        font-size: 11px;
                        border: 1px solid #cbd5e1;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    }
                    .info-table td { 
                        padding: 10px; 
                        border: 1px solid #cbd5e1; 
                        vertical-align: top;
                    }
                    .info-table .label { 
                        background-color: #f1f5f9; 
                        font-weight: bold; 
                        width: 20%;
                        color: #1e3a8a;
                    }
                    .items-table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-top: 10px; 
                        font-size: 11px;
                        border: 1px solid #cbd5e1;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    }
                    .items-table th { 
                        background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
                        color: white;
                        border: 1px solid #1e3a8a; 
                        padding: 12px 8px; 
                        text-align: center;
                        font-weight: bold;
                    }
                    .items-table td { 
                        border: 1px solid #cbd5e1; 
                        padding: 10px 8px; 
                        text-align: center; 
                    }
                    .items-table td:nth-child(2) {
                        text-align: left;
                    }
                    .items-table tr:nth-child(even) {
                        background-color: #f8fafc;
                    }
                    .totals { 
                        margin-top: 25px; 
                        text-align: right; 
                    }
                    .totals table { 
                        margin-left: auto; 
                        border-collapse: collapse; 
                        width: 450px;
                        font-size: 12px;
                        border: 2px solid #1e3a8a;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    .totals td { 
                        padding: 12px 15px; 
                        border: 1px solid #cbd5e1; 
                    }
                    .totals td:first-child {
                        background-color: #f1f5f9;
                        font-weight: bold;
                        text-align: left;
                        color: #1e3a8a;
                        width: 55%;
                    }
                    .totals tr:last-child {
                        font-weight: bold;
                        font-size: 14px;
                        background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
                        color: white;
                    }
                    .totals tr:last-child td {
                        border-color: #1e3a8a;
                    }
                    .gib-stamp {
                        border: 3px solid #dc2626;
                        color: #dc2626;
                        padding: 20px;
                        text-align: center;
                        font-weight: bold;
                        font-size: 18px;
                        margin: 30px 0;
                        border-radius: 10px;
                        background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
                        letter-spacing: 2px;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    }
                    .signature-area {
                        margin-top: 60px;
                        display: flex;
                        justify-content: space-between;
                        gap: 60px;
                    }
                    .signature-box {
                        flex: 1;
                        border: 2px solid #1e3a8a;
                        padding: 25px;
                        text-align: center;
                        font-size: 12px;
                        min-height: 140px;
                        background: linear-gradient(135deg, #fafafa 0%, #f1f5f9 100%);
                        border-radius: 10px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    .signature-box .title {
                        font-weight: bold;
                        color: #1e3a8a;
                        border-bottom: 2px solid #1e3a8a;
                        padding-bottom: 10px;
                        margin-bottom: 40px;
                        font-size: 14px;
                        text-transform: uppercase;
                    }
                    .signature-box .company-name {
                        font-weight: bold;
                        color: #334155;
                        margin: 20px 0;
                        font-size: 11px;
                        min-height: 30px;
                    }
                    .signature-box .sign-line {
                        border-top: 1px solid #64748b;
                        margin-top: 50px;
                        padding-top: 10px;
                        font-size: 10px;
                        color: #64748b;
                        font-style: italic;
                    }
                    .qr-area {
                        text-align: center;
                        margin: 30px 0;
                        padding: 25px;
                        border: 2px dashed #94a3b8;
                        background: #f8fafc;
                        border-radius: 10px;
                    }
                    .footer {
                        margin-top: 40px;
                        border-top: 3px solid #1e3a8a;
                        padding-top: 25px;
                        font-size: 10px;
                        color: #64748b;
                        text-align: center;
                    }
                    .footer p {
                        margin: 8px 0;
                    }
                    @media print {
                        @page { size: A4; margin: 15mm; }
                        body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .header { page-break-after: avoid; }
                        .section-title { page-break-after: avoid; }
                        .items-table thead { display: table-header-group; }
                        .totals { page-break-inside: avoid; }
                        .signature-area { page-break-inside: avoid; }
                        .footer { page-break-inside: avoid; }
                    }
                    .test-notice {
                        background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                        border: 2px solid #f59e0b;
                        color: #92400e;
                        padding: 20px;
                        text-align: center;
                        font-weight: bold;
                        font-size: 14px;
                        margin: 25px 0;
                        border-radius: 10px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                </style>
            </head>
            <body>
                <!-- HEADER -->
                <div class="header">
                    <table class="logo-table">
                        <tr>
                            <!-- Firma Logosu (Sol) -->
                            <td>
                                <div class="company-logo-box">
                                    <xsl:choose>
                                        <xsl:when test="//cac:AdditionalDocumentReference[cbc:DocumentTypeCode='LOGO']/cac:Attachment/cbc:EmbeddedDocumentBinaryObject">
                                            <xsl:variable name="logoObj" select="//cac:AdditionalDocumentReference[cbc:DocumentTypeCode='LOGO']/cac:Attachment/cbc:EmbeddedDocumentBinaryObject[1]"/>
                                            <img src="data:{$logoObj/@mimeCode};base64,{$logoObj}" alt="Firma Logosu" style="max-width:120px;max-height:80px;object-fit:contain;"/>
                                        </xsl:when>
                                        <xsl:otherwise>
                                            <div style="text-align: center;">
                                                <div style="font-weight: bold; color: #1e3a8a; font-size: 12px;">
                                                    <xsl:value-of select="//cac:AccountingSupplierParty//cac:PartyName//cbc:Name"/>
                                                </div>
                                                <div style="font-size: 9px; color: #64748b; margin-top: 5px;">FİRMA LOGO</div>
                                            </div>
                                        </xsl:otherwise>
                                    </xsl:choose>
                                </div>
                            </td>
                            
                            <!-- Ortada: Resmi GİB Logosu + E-Fatura Yazısı + Kullanıcı İmzası -->
                            <td>
                                <div class="gib-imza-block">
                                    <!-- T.C. Hazine ve Maliye Bakanlığı / Gelir İdaresi Başkanlığı – Resmi GİB logosu -->
                                    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 130 130' width='100' height='100'%3E%3Ccircle cx='65' cy='65' r='52' fill='none' stroke='%231e40af' stroke-width='4'/%3E%3Ctext x='65' y='38' text-anchor='middle' font-size='7' font-weight='bold' fill='%231e40af' font-family='Arial,sans-serif'%3ET.C. HAZ%C4%B0NE VE MAL%C4%B0YE%3C/text%3E%3Ctext x='65' y='48' text-anchor='middle' font-size='7' font-weight='bold' fill='%231e40af' font-family='Arial,sans-serif'%3EBAKANLI%C4%9EI%3C/text%3E%3Ctext x='65' y='92' text-anchor='middle' font-size='7' font-weight='bold' fill='%23dc2626' font-family='Arial,sans-serif'%3EGEL%C4%B0R %C4%B0DARES%C4%B0%3C/text%3E%3Ctext x='65' y='102' text-anchor='middle' font-size='7' font-weight='bold' fill='%23dc2626' font-family='Arial,sans-serif'%3EBA%C5%9EKANLI%C4%9EI%3C/text%3E%3Crect x='58' y='55' width='14' height='32' rx='2' fill='%23dc2626'/%3E%3Ccircle cx='65' cy='48' r='6' fill='%23dc2626'/%3E%3C/svg%3E" alt="T.C. Gelir İdaresi Başkanlığı" style="width:100px;height:100px;"/>
                                    
                                    <!-- E-Fatura Başlığı -->
                                    <h1 style="margin: 5px 0 5px; font-size: 26px; color: #1e3a8a; text-transform: uppercase; font-weight: bold; letter-spacing: 2px;">E-FATURA</h1>
                                    
                                    <!-- Kullanıcı İmzası -->
                                    <xsl:choose>
                                        <xsl:when test="//cac:AdditionalDocumentReference[cbc:DocumentTypeCode='IMZA']/cac:Attachment/cbc:EmbeddedDocumentBinaryObject">
                                            <xsl:variable name="imzaObj" select="//cac:AdditionalDocumentReference[cbc:DocumentTypeCode='IMZA']/cac:Attachment/cbc:EmbeddedDocumentBinaryObject[1]"/>
                                            <img src="data:{$imzaObj/@mimeCode};base64,{$imzaObj}" alt="Yetkili İmza" style="max-width:120px;max-height:50px;object-fit:contain;"/>
                                            <div style="font-size: 9px; color: #64748b; border-top: 1px solid #cbd5e1; padding-top: 5px; margin-top: 5px;">Yetkili İmza / Kaşe</div>
                                        </xsl:when>
                                        <xsl:otherwise>
                                            <div style="font-size: 9px; color: #94a3b8; border-top: 1px solid #cbd5e1; padding-top: 5px; margin-top: 5px; width: 80px;">İmza / Kaşe</div>
                                        </xsl:otherwise>
                                    </xsl:choose>
                                </div>
                            </td>
                            
                            <!-- Sağ Kolon (Senaryo / Ortam Bilgisi vs) -->
                            <td style="text-align: right; vertical-align: top; padding-top: 10px;">
                                <xsl:if test="//cbc:InvoiceTypeCode = 'EARSIVFATURA'">
                                    <h2 style="color: #dc2626; font-size: 14px; margin-top: 5px;">E-ARŞİV FATURA</h2>
                                </xsl:if>
                                <div class="test-badge">TEST ORTAMI</div>
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- FATURA BİLGİLERİ -->
                <div class="section-title">📋 FATURA BİLGİLERİ</div>
                <table class="info-table">
                    <tr>
                        <td class="label">Fatura No:</td>
                        <td><strong><xsl:value-of select="//cbc:ID"/></strong></td>
                        <td class="label">Fatura Tarihi:</td>
                        <td><xsl:value-of select="//cbc:IssueDate"/></td>
                    </tr>
                    <tr>
                        <td class="label">Senaryo:</td>
                        <td><xsl:value-of select="//cbc:ProfileID"/></td>
                        <td class="label">Fatura Tipi:</td>
                        <td><xsl:value-of select="//cbc:InvoiceTypeCode"/></td>
                    </tr>
                    <tr>
                        <td class="label">UUID:</td>
                        <td colspan="3" style="font-family: monospace; font-size: 10px;"><xsl:value-of select="//cbc:UUID"/></td>
                    </tr>
                </table>

                <!-- SATICI BİLGİLERİ -->
                <div class="section-title">🏢 SATICI BİLGİLERİ</div>
                <table class="info-table">
                    <tr>
                        <td class="label">VKN/TCKN:</td>
                        <td><xsl:value-of select="//cac:AccountingSupplierParty//cac:PartyIdentification//cbc:ID"/></td>
                        <td class="label">Vergi Dairesi:</td>
                        <td><xsl:value-of select="//cac:AccountingSupplierParty//cac:PartyTaxScheme//cbc:Name"/></td>
                    </tr>
                    <tr>
                        <td class="label">Ticaret Ünvanı:</td>
                        <td colspan="3"><strong><xsl:value-of select="//cac:AccountingSupplierParty//cac:PartyName//cbc:Name"/></strong></td>
                    </tr>
                    <tr>
                        <td class="label">Adres:</td>
                        <td colspan="3">
                            <xsl:value-of select="//cac:AccountingSupplierParty//cac:PostalAddress//cbc:StreetName"/>
                            <xsl:text> No:</xsl:text>
                            <xsl:value-of select="//cac:AccountingSupplierParty//cac:PostalAddress//cbc:BuildingNumber"/>
                        </td>
                    </tr>
                    <tr>
                        <td class="label">İlçe / İl:</td>
                        <td>
                            <xsl:value-of select="//cac:AccountingSupplierParty//cac:PostalAddress//cbc:CitySubdivisionName"/>
                            <xsl:text> / </xsl:text>
                            <xsl:value-of select="//cac:AccountingSupplierParty//cac:PostalAddress//cbc:CityName"/>
                        </td>
                        <td class="label">Telefon:</td>
                        <td><xsl:value-of select="//cac:AccountingSupplierParty//cac:Contact//cbc:Telephone"/></td>
                    </tr>
                    <tr>
                        <td class="label">E-Posta:</td>
                        <td><xsl:value-of select="//cac:AccountingSupplierParty//cac:Contact//cbc:ElectronicMail"/></td>
                        <td class="label">Web Sitesi:</td>
                        <td><xsl:value-of select="//cac:AccountingSupplierParty//cac:Contact//cbc:WebsiteURI"/></td>
                    </tr>
                </table>

                <!-- ALICI BİLGİLERİ -->
                <div class="section-title">👤 ALICI BİLGİLERİ</div>
                <table class="info-table">
                    <tr>
                        <td class="label">VKN/TCKN:</td>
                        <td><xsl:value-of select="//cac:AccountingCustomerParty//cac:PartyIdentification//cbc:ID"/></td>
                        <td class="label">Vergi Dairesi:</td>
                        <td><xsl:value-of select="//cac:AccountingCustomerParty//cac:PartyTaxScheme//cbc:Name"/></td>
                    </tr>
                    <tr>
                        <td class="label">Ad / Ünvan:</td>
                        <td colspan="3"><strong><xsl:value-of select="//cac:AccountingCustomerParty//cac:PartyName//cbc:Name"/></strong></td>
                    </tr>
                    <tr>
                        <td class="label">Adres:</td>
                        <td colspan="3">
                            <xsl:value-of select="//cac:AccountingCustomerParty//cac:PostalAddress//cbc:StreetName"/>
                            <xsl:text> No:</xsl:text>
                            <xsl:value-of select="//cac:AccountingCustomerParty//cac:PostalAddress//cbc:BuildingNumber"/>
                        </td>
                    </tr>
                    <tr>
                        <td class="label">İlçe / İl:</td>
                        <td>
                            <xsl:value-of select="//cac:AccountingCustomerParty//cac:PostalAddress//cbc:CitySubdivisionName"/>
                            <xsl:text> / </xsl:text>
                            <xsl:value-of select="//cac:AccountingCustomerParty//cac:PostalAddress//cbc:CityName"/>
                        </td>
                        <td class="label">Ülke:</td>
                        <td><xsl:value-of select="//cac:AccountingCustomerParty//cac:PostalAddress//cac:Country//cbc:Name"/></td>
                    </tr>
                </table>

                <!-- FATURA KALEMLERİ -->
                <div class="section-title">🛒 FATURA KALEMLERİ</div>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th style="width: 5%;">Sıra</th>
                            <th style="width: 35%;">Mal/Hizmet Açıklaması</th>
                            <th style="width: 8%;">Miktar</th>
                            <th style="width: 8%;">Birim</th>
                            <th style="width: 12%;">Birim Fiyat</th>
                            <th style="width: 10%;">İskonto</th>
                            <th style="width: 8%;">KDV %</th>
                            <th style="width: 14%;">Toplam</th>
                        </tr>
                    </thead>
                    <tbody>
                        <xsl:for-each select="//cac:InvoiceLine">
                            <tr>
                                <td><xsl:value-of select="cbc:ID"/></td>
                                <td style="text-align: left;">
                                    <strong><xsl:value-of select="cac:Item//cbc:Name"/></strong>
                                    <xsl:if test="cac:Item//cbc:Description">
                                        <br/><span style="font-size: 9px; color: #64748b;"><xsl:value-of select="cac:Item//cbc:Description"/></span>
                                    </xsl:if>
                                </td>
                                <td><xsl:value-of select="cbc:InvoicedQuantity"/></td>
                                <td><xsl:value-of select="cbc:InvoicedQuantity/@unitCode"/></td>
                                <td>
                                    <xsl:value-of select="cac:Price//cbc:PriceAmount"/>
                                    <xsl:text> </xsl:text>
                                    <xsl:value-of select="cac:Price//cbc:PriceAmount/@currencyID"/>
                                </td>
                                <td>
                                    <xsl:choose>
                                        <xsl:when test="cac:AllowanceCharge//cbc:Amount">
                                            <xsl:value-of select="cac:AllowanceCharge//cbc:Amount"/>
                                        </xsl:when>
                                        <xsl:otherwise>-</xsl:otherwise>
                                    </xsl:choose>
                                </td>
                                <td>
                                    <xsl:value-of select="cac:TaxTotal//cac:TaxSubtotal//cbc:Percent"/>%
                                </td>
                                <td>
                                    <strong>
                                        <xsl:value-of select="cbc:LineExtensionAmount"/>
                                        <xsl:text> </xsl:text>
                                        <xsl:value-of select="cbc:LineExtensionAmount/@currencyID"/>
                                    </strong>
                                </td>
                            </tr>
                        </xsl:for-each>
                    </tbody>
                </table>

                <!-- TOPLAMLAR -->
                <div class="section-title">💰 TOPLAMLAR</div>
                <div class="totals">
                    <table>
                        <tr>
                            <td>Mal Hizmet Toplamı:</td>
                            <td>
                                <xsl:value-of select="//cac:LegalMonetaryTotal//cbc:LineExtensionAmount"/>
                                <xsl:text> </xsl:text>
                                <xsl:value-of select="//cac:LegalMonetaryTotal//cbc:LineExtensionAmount/@currencyID"/>
                            </td>
                        </tr>
                        <tr>
                            <td>İskonto Toplamı:</td>
                            <td>
                                <xsl:value-of select="//cac:LegalMonetaryTotal//cbc:AllowanceTotalAmount"/>
                                <xsl:text> </xsl:text>
                                <xsl:value-of select="//cac:LegalMonetaryTotal//cbc:AllowanceTotalAmount/@currencyID"/>
                            </td>
                        </tr>
                        <tr>
                            <td>KDV Matrahı:</td>
                            <td>
                                <xsl:value-of select="//cac:LegalMonetaryTotal//cbc:TaxExclusiveAmount"/>
                                <xsl:text> </xsl:text>
                                <xsl:value-of select="//cac:LegalMonetaryTotal//cbc:TaxExclusiveAmount/@currencyID"/>
                            </td>
                        </tr>
                        <tr>
                            <td>KDV Toplamı:</td>
                            <td>
                                <xsl:value-of select="//cac:TaxTotal//cbc:TaxAmount"/>
                                <xsl:text> </xsl:text>
                                <xsl:value-of select="//cac:TaxTotal//cbc:TaxAmount/@currencyID"/>
                            </td>
                        </tr>
                        <tr>
                            <td>Vergiler Dahil Toplam:</td>
                            <td>
                                <xsl:value-of select="//cac:LegalMonetaryTotal//cbc:TaxInclusiveAmount"/>
                                <xsl:text> </xsl:text>
                                <xsl:value-of select="//cac:LegalMonetaryTotal//cbc:TaxInclusiveAmount/@currencyID"/>
                            </td>
                        </tr>
                        <tr style="font-size: 16px;">
                            <td>ÖDENECEK TUTAR:</td>
                            <td>
                                <xsl:value-of select="//cac:LegalMonetaryTotal//cbc:PayableAmount"/>
                                <xsl:text> </xsl:text>
                                <xsl:value-of select="//cac:LegalMonetaryTotal//cbc:PayableAmount/@currencyID"/>
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- GİB DAMGASI -->
                <div class="gib-stamp">
                    ✓ T.C. GELİR İDARESİ BAŞKANLIĞI ONAYLI E-FATURA
                </div>

                <!-- AÇIKLAMA VE NOTLAR -->
                <xsl:if test="//cbc:Note[not(contains(., 'Bu belge e-fatura'))]">
                    <div class="section-title">📝 AÇIKLAMA VE NOTLAR</div>
                    <div style="padding: 15px; background-color: #f8fafc; border: 1px solid #cbd5e1; margin-top: 10px; border-radius: 6px; white-space: pre-wrap;">
                        <xsl:for-each select="//cbc:Note[not(contains(., 'Bu belge e-fatura'))]">
                            <xsl:value-of select="."/>
                            <xsl:if test="position() != last()"><xsl:text>&#10;&#10;</xsl:text></xsl:if>
                        </xsl:for-each>
                    </div>
                </xsl:if>

                <!-- QR ALANI -->
                <div class="qr-area">
                    <p style="margin: 0 0 10px 0; font-weight: bold; color: #1e3a8a;">📱 Fatura Doğrulama</p>
                    <p style="font-size: 11px; color: #64748b; margin: 0;">
                        Bu fatura elektronik ortamda oluşturulmuştur.<br/>
                        Doğrulama için: <strong>https://efatura.gib.gov.tr</strong>
                    </p>
                </div>

                <!-- İMZA ALANLARI -->
                <div class="signature-area">
                    <div class="signature-box">
                        <div class="title">SATICI</div>
                        <div class="company-name">
                            <xsl:value-of select="//cac:AccountingSupplierParty//cac:PartyName//cbc:Name"/>
                        </div>
                        <div class="sign-line">Yetkili İmza / Kaşe / Mühür</div>
                    </div>
                    <div class="signature-box">
                        <div class="title">ALICI</div>
                        <div class="company-name">
                            <xsl:value-of select="//cac:AccountingCustomerParty//cac:PartyName//cbc:Name"/>
                        </div>
                        <div class="sign-line">Yetkili İmza / Kaşe / Mühür</div>
                    </div>
                </div>

                <!-- TEST UYARISI -->
                <div class="test-notice">
                    ⚠️ TEST ORTAMI: Bu fatura test amaçlı oluşturulmuştur. Ticari değeri yoktur.
                </div>

                <!-- FOOTER -->
                <div class="footer">
                    <p style="font-size: 12px; color: #1e3a8a; font-weight: bold;">
                        T.C. GELİR İDARESİ BAŞKANLIĞI ONAYLI E-FATURA
                    </p>
                    <p>
                        Oluşturulma Tarihi: <xsl:value-of select="//cbc:IssueDate"/> | 
                        UUID: <xsl:value-of select="//cbc:UUID"/>
                    </p>
                    <p style="font-size: 9px; color: #94a3b8; margin-top: 10px;">
                        Bu belge 5070 sayılı Elektronik İmza Kanunu ve 213 sayılı Vergi Usul Kanunu uyarınca elektronik ortamda oluşturulmuştur.<br/>
                        GİB Portal: https://efatura.gib.gov.tr | Mali Mühür doğrulaması zorunludur.
                    </p>
                </div>
            </body>
        </html>
    </xsl:template>
</xsl:stylesheet>`;

// Base64'e çevir
const GIB_STANDARD_XSLT_BASE64 = Buffer.from(GIB_XSLT_TEMPLATE, 'utf-8').toString('base64');

module.exports = { 
  GIB_XSLT_TEMPLATE,
  GIB_STANDARD_XSLT_BASE64 
};