import AdmZip from "adm-zip";

/**
 * UBL XML → ZIP'e çevirir
 * @param {string} xml - UBL xml içeriği
 * @param {string} uuid - zip dosya adı
 * @returns {Buffer} ZIP binary
 */
export function createUblZip(xml, uuid) {
  const zip = new AdmZip();
  zip.addFile(`${uuid}.xml`, Buffer.from(xml, "utf-8"));
  return zip.toBuffer();
}
