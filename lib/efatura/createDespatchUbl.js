/**
 * UBL-TR 2.1 E-İrsaliye (DespatchAdvice) XML Oluşturucu
 * GİB e-İrsaliye standartlarına uyumlu
 * Taxten dokümanı: Dijital imzalar gönderilmemeli (platform imzalar)
 *
 * @param {Object} irsaliye - İrsaliye verisi
 * @param {Object} company - Firma ayarları
 * @returns {string} UBL-TR 2.1 DespatchAdvice XML
 */
import { create } from "xmlbuilder2";

export function createDespatchUbl(irsaliye, company) {
  const {
    uuid,
    irsaliyeNo,
    issueDate,
    customer,
    items = [],
    notes = "",
    custDesId = null,
    shipmentDate,
    actualDeliveryDate,
  } = irsaliye;

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
  } = company;

  const currency = "TRY";
  const formattedDate =
    issueDate && issueDate.includes("T")
      ? issueDate.split("T")[0]
      : issueDate || new Date().toISOString().split("T")[0];

  const customerVkn = customer?.vknTckn || customer?.vkn || customer?.identifier || "";
  const isCompany = customerVkn.length === 10;
  const customerTitle = customer?.title || customer?.unvan || customer?.ad || "Müşteri";
  const customerStreet = customer?.street || customer?.adres || "";
  const customerCity = customer?.city || "";
  const customerDistrict = customer?.district || "";

  // AdditionalDocumentReference: CustDesID (ID otomatik üretiliyorsa zorunlu)
  const additionalDocs = [];
  if (custDesId) {
    additionalDocs.push({
      "cbc:ID": custDesId,
      "cbc:IssueDate": formattedDate,
      "cbc:DocumentTypeCode": "CUST_DES_ID",
      "cbc:DocumentType": "CUST_DES_ID",
    });
  }

  const despatchLines = items.map((item, index) => {
    const quantity = Number(item.quantity || item.miktar || 1);
    const unitCode = item.birim || item.unit || "C62";
    return {
      "cbc:ID": index + 1,
      "cbc:DeliveredQuantity": {
        "@unitCode": unitCode,
        "#text": quantity.toFixed(2),
      },
      "cac:Item": {
        "cbc:Name": item.name || item.urunAd || "Ürün",
        "cbc:Description": item.aciklama || item.description || "",
      },
    };
  });

  const doc = {
    DespatchAdvice: {
      "@xmlns": "urn:oasis:names:specification:ubl:schema:xsd:DespatchAdvice-2",
      "@xmlns:cac": "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
      "@xmlns:cbc": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",

      "cbc:UBLVersionID": "2.1",
      "cbc:CustomizationID": "TR1.2.1",
      "cbc:ID": irsaliyeNo || "DESP-001",
      "cbc:CopyIndicator": "false",
      "cbc:UUID": uuid,
      "cbc:IssueDate": formattedDate,
      ...(notes && { "cbc:Note": notes }),

      ...(additionalDocs.length > 0 && {
        "cac:AdditionalDocumentReference": additionalDocs,
      }),

      "cac:DespatchSupplierParty": {
        "cac:Party": {
          "cac:PartyIdentification": {
            "cbc:ID": {
              "@schemeID": "VKN",
              "#text": company.vergiNo || companyVkn || "",
            },
          },
          "cac:PartyName": {
            "cbc:Name": companyTitle,
          },
          "cac:PostalAddress": {
            "cbc:StreetName": street,
            "cbc:BuildingNumber": buildingNumber,
            "cbc:CitySubdivisionName": district || "",
            "cbc:CityName": city,
            "cbc:Country": {
              "cbc:Name": "Türkiye",
            },
          },
          "cac:PartyTaxScheme": {
            "cac:TaxScheme": {
              "cbc:Name": vergiDairesi,
            },
          },
          "cac:Contact": {
            "cbc:Telephone": phone || "",
            "cbc:ElectronicMail": email || "",
          },
        },
      },

      "cac:DeliveryCustomerParty": {
        "cac:Party": {
          "cac:PartyIdentification": {
            "cbc:ID": {
              "@schemeID": isCompany ? "VKN" : "TCKN",
              "#text": customerVkn || "0000000000",
            },
          },
          "cac:PartyName": {
            "cbc:Name": customerTitle,
          },
          "cac:PostalAddress": {
            "cbc:StreetName": customerStreet,
            "cbc:CitySubdivisionName": customerDistrict,
            "cbc:CityName": customerCity,
            "cbc:Country": {
              "cbc:Name": "Türkiye",
            },
          },
        },
      },

      "cac:Shipment": {
        "cbc:ID": "SHP-1",
        "cbc:ShippingPriorityLevelCode": "Normal",
        "cbc:LatestDeliveryDate": shipmentDate || formattedDate,
        "cac:DeliveryAddress": {
          "cbc:StreetName": customerStreet,
          "cbc:CitySubdivisionName": customerDistrict,
          "cbc:CityName": customerCity,
          "cbc:Country": {
            "cbc:Name": "Türkiye",
          },
        },
      },

      "cac:DespatchLine": despatchLines.length > 0 ? despatchLines : [
        {
          "cbc:ID": 1,
          "cbc:DeliveredQuantity": { "@unitCode": "C62", "#text": "1" },
          "cac:Item": { "cbc:Name": "Sevk Edilen Mal" },
        },
      ],
    },
  };

  return create(doc).end({ prettyPrint: true, headless: false });
}
