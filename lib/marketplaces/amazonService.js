export async function amazonCreateProduct(product) {
  console.log("Amazon Dummy Product Create:", product.name);

  return {
    success: true,
    productId: "AMZ_TEST_" + Date.now(),
    message: "Amazon’a dummy ürün gönderildi."
  };
}
