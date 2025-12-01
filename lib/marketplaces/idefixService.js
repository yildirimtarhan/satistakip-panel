export async function idefixCreateProduct(product) {
  console.log("Idefix Dummy Product Create:", product.name);

  return {
    success: true,
    productId: "IDFX_TEST_" + Date.now(),
    message: "İdefix’e dummy ürün gönderildi."
  };
}
