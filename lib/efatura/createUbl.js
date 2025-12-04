import { create } from "xmlbuilder2";

/**
 * UBL XML oluşturucu
 * @param {Object} invoice - fatura verisi (taslaktan gelir)
 * @param {Object} company - firma ayarları (company_settings)
 * @returns {string} - XML string
 */
export function createUbl(invoice, company) {
  const {
    invoiceType = "EARSIVFATURA",
    uuid,
    issueDate,
    customer,
    items,
    totals,
    notes,
  } = invoice;

  const {
    title,
    vkn,
    taxOffice,
    street,
    buildingNumber,
    city,
    district,
    phone,
    email,
    website,
    logoBase64,  // Firma ayarlarından gelecek
    footerNote,  // İmza/Açıklama yazısı
  } = company;

  const doc = {
    "Invoice": {
      "@xmlns": "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
      "@xmlns:cac": "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
      "@xmlns:cbc": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",

      "cbc:CustomizationID": "TR1.2.1",
      "cbc:ProfileID": invoiceType === "EFATURA" ? "TICARIFATURA" : "EARSIVFATURA",
      "cbc:ID": invoice.invoiceNumber,
      "cbc:UUID": uuid,
      "cbc:IssueDate": issueDate,
      "cbc:InvoiceTypeCode": invoiceType,

      // ✔ Firma Bilgileri
      "cac:AccountingSupplierParty": {
        "cac:Party": {
          "cac:PartyIdentification": {
            "cbc:ID": vkn
          },
          "cac:PartyName": { "cbc:Name": title },
          "cac:PostalAddress": {
            "cbc:StreetName": street,
            "cbc:BuildingNumber": buildingNumber,
            "cbc:CityName": city,
            "cbc:District": district,
          },
          "cac:Contact": {
            "cbc:Telephone": phone,
            "cbc:ElectronicMail": email,
            "cbc:WebsiteURI": website
          }
        }
      },

      // ✔ Müşteri bilgileri
      "cac:AccountingCustomerParty": {
        "cac:Party": {
          "cac:PartyIdentification": {
            "cbc:ID": customer.vknTckn
          },
          "cac:PartyName": { "cbc:Name": customer.title },
          "cac:Contact": {
            "cbc:ElectronicMail": customer.email || "",
            "cbc:Telephone": customer.phone || ""
          }
        }
      },

      // ✔ Ürün satırları
      "cac:InvoiceLine": items.map((p, index) => ({
        "cbc:ID": index + 1,
        "cbc:InvoicedQuantity": p.quantity,
        "cbc:LineExtensionAmount": { "@currencyID": "TRY", "#text": p.total },
        "cac:Item": { "cbc:Name": p.name },
        "cac:Price": {
          "cbc:PriceAmount": { "@currencyID": "TRY", "#text": p.price }
        }
      })),

      // ✔ Özet toplamlar
      "cac:LegalMonetaryTotal": {
        "cbc:LineExtensionAmount": { "@currencyID": "TRY", "#text": totals.subtotal },
        "cbc:TaxExclusiveAmount": { "@currencyID": "TRY", "#text": totals.subtotal },
        "cbc:TaxInclusiveAmount": { "@currencyID": "TRY", "#text": totals.total },
        "cbc:PayableAmount": { "@currencyID": "TRY", "#text": totals.total }
      },

      // ✔ Logo Base64
      ...(logoBase64
        ? {
            "cac:AdditionalDocumentReference": {
              "cbc:ID": "LOGO",
              "cac:Attachment": {
                "cbc:EmbeddedDocumentBinaryObject": {
                  "@mimeCode": "image/png",
                  "#text": logoBase64
                }
              }
            }
          }
        : {}),

      // ✔ Alt açıklama / imza metni
      ...(footerNote
        ? { "cbc:Note": footerNote }
        : {}),
    }
  };

  return create(doc).end({ prettyPrint: true });
}
