export async function createTaxtenAccount(application, company) {
  // 🔜 Buraya gerçek Taxten REST isteği gelecek
  console.log("Taxten hesap açılıyor:", {
    firma: company.companyTitle,
    vkn: company.vknTckn,
    modules: application.modules,
  });

  return {
    success: true,
    taxtenCustomerId: "TEST-123456",
  };
}
