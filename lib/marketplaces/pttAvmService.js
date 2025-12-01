export async function pttAvmCreateProduct(product) {
  console.log("PTT AVM Dummy Product Create:", product.name);

  return {
    success: true,
    productId: "PTT_TEST_" + Date.now(),
    message: "PTT AVM’ye dummy ürün gönderildi."
  };
}
