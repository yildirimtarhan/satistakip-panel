export async function pazaramaCreateProduct(product) {
  console.log("Pazarama Dummy Product Create:", product.name);

  return {
    success: true,
    productId: "PZRM_TEST_" + Date.now(),
    message: "Pazarama’ya dummy ürün gönderildi."
  };
}
