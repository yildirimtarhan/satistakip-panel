import { create } from "xmlbuilder2";
import { GIB_STANDARD_XSLT_BASE64 } from "./gibXslt.js";

/**
 * Tam UBL-TR 2.1 Fatura XML Oluşturucu
 * GİB ve Taxten standartlarına tam uyumlu
 * 
 * @param {Object} invoice - Fatura verisi
 * @param {Object} company - Firma ayarları
 * @returns {string} UBL-TR 2.1 XML
 */
export function createUbl(invoice, company) {
  const {
    uuid,
    invoiceNumber,
    issueDate,
    invoiceType = "EARSIVFATURA",
    scenario = "TICARI",
    customer,
    items = [],
    totals = {},
    notes = "",
    custInvId = null,
  } = invoice;

  const {
    title: companyTitle,
    vkn: companyVkn,
    vergiDairesi,
    street,
    buildingNumber = "",
    city,
    district,
    phone,
    email,
    website = "",
    country = "Türkiye",
    logo: companyLogo,
    imza: companyImza,
  } = company;

  // Para birimi ve KDV hesaplamaları
  const currency = "TRY";
  const lineExtensionAmount = totals.subtotal || 0;
  const taxExclusiveAmount = totals.subtotal || 0;
  const taxInclusiveAmount = totals.total || 0;
  const payableAmount = totals.total || 0;
  const taxAmount = totals.taxTotal || (totals.total - totals.subtotal) || 0;

  // Tarih formatı: YYYY-MM-DD
  const formattedDate = issueDate && issueDate.includes("T") 
    ? issueDate.split("T")[0] 
    : (issueDate || new Date().toISOString().split("T")[0]);

  // Müşteri bilgileri
  const customerVkn = customer.vknTckn || customer.vkn || customer.identifier || "";
  const isCompany = customerVkn.length === 10;
  const customerTitle = customer.title || customer.unvan || customer.ad || "Müşteri";
  const customerStreet = customer.street || customer.adres || "";
  const customerCity = customer.city || "";
  const customerDistrict = customer.district || "";
  const customerCountry = customer.country || "Türkiye";

  // AdditionalDocumentReference'ler (XSLT + CustInvID)
  const additionalDocs = [];
  
  // 1. XSLT Şablonu (ZORUNLU - GİB standart)
  additionalDocs.push({
    "cbc:ID": `XSLT-${uuid.slice(0, 8)}`,
    "cbc:IssueDate": formattedDate,
    "cbc:DocumentTypeCode": "XSLT",
    "cbc:DocumentType": "XSLT",
    "cac:Attachment": {
      "cbc:EmbeddedDocumentBinaryObject": {
        "@characterCode": "UTF-8",
        "@encodingCode": "Base64",
        "@filename": `${invoiceNumber}.xslt`,
        "@mimeCode": "application/xml",
        "#text": GIB_STANDARD_XSLT_BASE64
      }
    }
  });

  // 2. CustInvID (Eğer fatura ID'si otomatik üretiliyorsa)
  if (custInvId) {
    additionalDocs.push({
      "cbc:ID": custInvId,
      "cbc:IssueDate": formattedDate,
      "cbc:DocumentTypeCode": "CUST_INV_ID",
      "cbc:DocumentType": "CUST_INV_ID"
    });
  }

  // 3. Firma İmzası (Başvuru/Firma Ayarlarından – GİB önizlemede GİB logosu altında)
  if (companyImza && typeof companyImza === "string" && companyImza.startsWith("data:image")) {
    const matchImza = companyImza.match(/^data:(image\/[a-z]+);base64,(.+)$/);
    if (matchImza) {
      const mimeImza = matchImza[1];
      const base64Imza = matchImza[2].replace(/\s/g, "");
      const extImza = mimeImza === "image/png" ? "png" : "jpg";
      additionalDocs.push({
        "cbc:ID": "IMZA-1",
        "cbc:IssueDate": formattedDate,
        "cbc:DocumentTypeCode": "IMZA",
        "cbc:DocumentType": "IMZA",
        "cac:Attachment": {
          "cbc:EmbeddedDocumentBinaryObject": {
            "@characterCode": "UTF-8",
            "@encodingCode": "Base64",
            "@filename": `imza.${extImza}`,
            "@mimeCode": mimeImza,
            "#text": base64Imza
          }
        }
      });
    }
  }

  // 4. Firma Logosu (Firma Ayarlarından – GİB önizlemede görünür)
  if (companyLogo && typeof companyLogo === "string" && companyLogo.startsWith("data:image")) {
    const match = companyLogo.match(/^data:(image\/[a-z]+);base64,(.+)$/);
    if (match) {
      const mime = match[1];
      const base64 = match[2].replace(/\s/g, "");
      const ext = mime === "image/png" ? "png" : "jpg";
      additionalDocs.push({
        "cbc:ID": "LOGO-1",
        "cbc:IssueDate": formattedDate,
        "cbc:DocumentTypeCode": "LOGO",
        "cbc:DocumentType": "LOGO",
        "cac:Attachment": {
          "cbc:EmbeddedDocumentBinaryObject": {
            "@characterCode": "UTF-8",
            "@encodingCode": "Base64",
            "@filename": `logo.${ext}`,
            "@mimeCode": mime,
            "#text": base64
          }
        }
      });
    }
  }

  // Notlar dizisi
  const noteArray = [];
  if (notes) {
    noteArray.push(notes);
  }
  noteArray.push("Bu belge e-fatura/e-arşiv olarak düzenlenmiştir.");

  // Ürün satırları detaylı
  const invoiceLines = items.map((item, index) => {
    const lineId = index + 1;
    const quantity = Number(item.quantity || item.miktar || 1);
    const price = Number(item.price || item.birimFiyat || 0);
    const kdvRate = Number(item.kdvOran || item.vatRate || 20);
    const iskontoRate = Number(item.iskonto || item.iskontoOrani || 0);
    
    let lineTotal = quantity * price;
    if (iskontoRate > 0) {
      lineTotal -= (lineTotal * iskontoRate) / 100;
    }
    
    const lineTaxAmount = lineTotal * (kdvRate / 100);
    const unitCode = item.birim || item.unit || "C62";

    return {
      "cbc:ID": lineId,
      "cbc:InvoicedQuantity": {
        "@unitCode": unitCode,
        "#text": quantity.toFixed(2)
      },
      "cbc:LineExtensionAmount": {
        "@currencyID": currency,
        "#text": lineTotal.toFixed(2)
      },
      "cac:TaxTotal": {
        "cbc:TaxAmount": {
          "@currencyID": currency,
          "#text": lineTaxAmount.toFixed(2)
        },
        "cac:TaxSubtotal": {
          "cbc:TaxableAmount": {
            "@currencyID": currency,
            "#text": lineTotal.toFixed(2)
          },
          "cbc:TaxAmount": {
            "@currencyID": currency,
            "#text": lineTaxAmount.toFixed(2)
          },
          "cac:TaxCategory": {
            "cac:TaxScheme": {
              "cbc:Name": "KDV",
              "cbc:TaxTypeCode": "0015"
            },
            "cbc:Percent": kdvRate
          }
        }
      },
      "cac:Item": {
        "cbc:Name": item.name || item.urunAd || "Ürün",
        "cbc:Description": item.aciklama || item.description || ""
      },
      "cac:Price": {
        "cbc:PriceAmount": {
          "@currencyID": currency,
          "#text": price.toFixed(2)
        }
      }
    };
  });

  // Vergi toplamları (KDV) - Her oran için ayrı satır
  const taxSubtotals = [];
  const kdvOranlari = [...new Set(items.map(i => Number(i.kdvOran || i.vatRate || 20)))];
  
  kdvOranlari.forEach(rate => {
    const itemsWithRate = items.filter(i => Number(i.kdvOran || i.vatRate || 20) === rate);
    let taxableAmount = 0;
    let taxAmountCalc = 0;
    
    itemsWithRate.forEach(item => {
      const qty = Number(item.quantity || 1);
      const price = Number(item.price || 0);
      const iskonto = Number(item.iskonto || 0);
      let lineTotal = qty * price;
      if (iskonto > 0) lineTotal -= (lineTotal * iskonto) / 100;
      
      taxableAmount += lineTotal;
      taxAmountCalc += lineTotal * (rate / 100);
    });

    taxSubtotals.push({
      "cbc:TaxableAmount": {
        "@currencyID": currency,
        "#text": taxableAmount.toFixed(2)
      },
      "cbc:TaxAmount": {
        "@currencyID": currency,
        "#text": taxAmountCalc.toFixed(2)
      },
      "cac:TaxCategory": {
        "cac:TaxScheme": {
          "cbc:Name": "KDV",
          "cbc:TaxTypeCode": "0015"
        },
        "cbc:Percent": rate
      }
    });
  });

  // Ana UBL yapısı
  const doc = {
    "Invoice": {
      "@xmlns": "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
      "@xmlns:cac": "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
      "@xmlns:cbc": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
      "@xmlns:ext": "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2",
      
      "ext:UBLExtensions": {
        "ext:UBLExtension": {
          "ext:ExtensionContent": {}
        }
      },

      "cbc:UBLVersionID": "2.1",
      "cbc:CustomizationID": "TR1.2.1",
      "cbc:ProfileID": scenario === "TEMEL" ? "TEMELFATURA" : "TICARIFATURA",
      "cbc:ID": invoiceNumber,
      "cbc:CopyIndicator": "false",
      "cbc:UUID": uuid,
      "cbc:IssueDate": formattedDate,
      "cbc:InvoiceTypeCode": invoiceType,
      
      "cbc:Note": noteArray,

      "cbc:DocumentCurrencyCode": currency,

      "cac:AdditionalDocumentReference": additionalDocs,

      "cac:Signature": {
        "cbc:ID": "Signature1",
        "cac:SignatoryParty": {
          "cac:PartyIdentification": {
            "cbc:ID": companyVkn
          },
          "cac:PartyName": {
            "cbc:Name": companyTitle
          }
        },
        "cac:DigitalSignatureAttachment": {
          "cac:ExternalReference": {
            "cbc:URI": ""
          }
        }
      },

      "cac:AccountingSupplierParty": {
        "cac:Party": {
          "cac:PartyIdentification": {
            "cbc:ID": {
              "@schemeID": "VKN",
              "#text": companyVkn
            }
          },
          "cac:PartyName": {
            "cbc:Name": companyTitle
          },
          "cac:PostalAddress": {
            "cbc:StreetName": street,
            "cbc:BuildingNumber": buildingNumber,
            "cbc:CitySubdivisionName": district,
            "cbc:CityName": city,
            "cbc:Country": {
              "cbc:Name": country
            }
          },
          "cac:PartyTaxScheme": {
            "cac:TaxScheme": {
              "cbc:Name": vergiDairesi
            }
          },
          "cac:Contact": {
            "cbc:Telephone": phone,
            "cbc:ElectronicMail": email,
            "cbc:WebsiteURI": website
          }
        }
      },

      "cac:AccountingCustomerParty": {
        "cac:Party": {
          "cac:PartyIdentification": {
            "cbc:ID": {
              "@schemeID": isCompany ? "VKN" : "TCKN",
              "#text": customerVkn
            }
          },
          "cac:PartyName": {
            "cbc:Name": customerTitle
          },
          "cac:PostalAddress": {
            "cbc:StreetName": customerStreet,
            "cbc:CitySubdivisionName": customerDistrict,
            "cbc:CityName": customerCity,
            "cbc:Country": {
              "cbc:Name": customerCountry
            }
          },
          "cac:Contact": {
            "cbc:ElectronicMail": customer.email || "",
            "cbc:Telephone": customer.phone || ""
          }
        }
      },

      "cac:TaxTotal": {
        "cbc:TaxAmount": {
          "@currencyID": currency,
          "#text": taxAmount.toFixed(2)
        },
        "cac:TaxSubtotal": taxSubtotals
      },

      "cac:LegalMonetaryTotal": {
        "cbc:LineExtensionAmount": {
          "@currencyID": currency,
          "#text": lineExtensionAmount.toFixed(2)
        },
        "cbc:TaxExclusiveAmount": {
          "@currencyID": currency,
          "#text": taxExclusiveAmount.toFixed(2)
        },
        "cbc:TaxInclusiveAmount": {
          "@currencyID": currency,
          "#text": taxInclusiveAmount.toFixed(2)
        },
        "cbc:AllowanceTotalAmount": {
          "@currencyID": currency,
          "#text": "0.00"
        },
        "cbc:ChargeTotalAmount": {
          "@currencyID": currency,
          "#text": "0.00"
        },
        "cbc:PayableAmount": {
          "@currencyID": currency,
          "#text": payableAmount.toFixed(2)
        }
      },

      "cac:InvoiceLine": invoiceLines
    }
  };

  return create(doc).end({ prettyPrint: true, headless: false });
}