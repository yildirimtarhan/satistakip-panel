export async function ciceksepetiCreateProduct(product) {
  console.log("CicekSepeti Dummy Product Create:", product.name);

  return {
    success: true,
    productId: "CICEK_TEST_" + Date.now(),
    message: "ÇiçekSepeti’ne dummy ürün gönderildi."
  };
}
