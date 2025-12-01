export async function hbCreateProduct(product) {
  console.log("HB Dummy Product Create:", product.name);

  return {
    success: true,
    productId: "HB_TEST_" + Date.now(),
    message: "Hepsiburada’ya dummy ürün gönderildi."
  };
}
