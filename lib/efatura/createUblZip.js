import AdmZip from "adm-zip";

/**
 * UBL XML → ZIP'e çevirir
 * Taxten Standartları:
 * - Zip içindeki tek XML dosyasının adı UUID ile aynı olmalı
 * - UTF-8 BOM (Byte Order Mark) eklenmeli (GİB standartı)
 * - Max 5MB boyut limiti kontrolü
 * 
 * @param {string} xml - UBL xml içeriği
 * @param {string} uuid - Fatura UUID (XML dosya adı da bu olacak)
 * @returns {Buffer} ZIP binary
 */
export function createUblZip(xml, uuid) {
  // UUID kontrolü
  if (!uuid || typeof uuid !== 'string') {
    throw new Error('UUID geçersiz veya eksik');
  }

  const zip = new AdmZip();
  
  // Taxten kuralı: XML dosya adı = UUID.xml
  const fileName = `${uuid}.xml`;
  
  // UTF-8 BOM ekle (GİB standartı - olmazsa Türkçe karakter sorunu)
  const xmlWithBom = '\ufeff' + xml;
  
  // Buffer oluştur (UTF-8 encoding)
  const xmlBuffer = Buffer.from(xmlWithBom, 'utf-8');
  
  // ZIP'e ekle
  zip.addFile(fileName, xmlBuffer);
  
  // ZIP buffer oluştur
  const zipBuffer = zip.toBuffer();
  
  // Boyut kontrolü (Taxten max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (zipBuffer.length > maxSize) {
    throw new Error(`ZIP boyutu 5MB limitini aşıyor (${(zipBuffer.length / 1024 / 1024).toFixed(2)}MB)`);
  }
  
  return zipBuffer;
}

/**
 * ZIP içeriğini Base64 olarak döndürür
 * Taxten API'ye gönderim için kullanılır
 * 
 * @param {string} xml - UBL XML
 * @param {string} uuid - Fatura UUID
 * @returns {string} Base64 encoded ZIP
 */
export function createUblZipBase64(xml, uuid) {
  const zipBuffer = createUblZip(xml, uuid);
  return zipBuffer.toString('base64');
}

/**
 * ZIP boyutunu kontrol et (debug için)
 * 
 * @param {string} xml - UBL XML
 * @param {string} uuid - Fatura UUID
 * @returns {Object} Boyut bilgileri
 */
export function getZipInfo(xml, uuid) {
  const zipBuffer = createUblZip(xml, uuid);
  const xmlSize = Buffer.byteLength(xml, 'utf8');
  
  return {
    xmlSizeBytes: xmlSize,
    xmlSizeKB: (xmlSize / 1024).toFixed(2),
    zipSizeBytes: zipBuffer.length,
    zipSizeKB: (zipBuffer.length / 1024).toFixed(2),
    compressionRatio: ((1 - zipBuffer.length / xmlSize) * 100).toFixed(1) + '%',
    isValid: zipBuffer.length < 5 * 1024 * 1024
  };
}