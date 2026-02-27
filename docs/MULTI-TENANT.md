# Multi-tenant mimari

Bu proje **multi-tenant** tasarlanmıştır; aynı uygulama birden fazla firmaya satılır, her firma ve kullanıcı **sadece kendi verisini** görür.

## Temel kavramlar

| Alan       | Açıklama |
|-----------|----------|
| **companyId** | Firma (tenant). Aynı firmadaki kullanıcılar aynı ürün, cari, satış, ayar verisini paylaşır. |
| **userId**    | Kullanıcı. Bazı veriler (örn. cari) kullanıcı bazlı da filtrelenebilir. |

## İzolasyon kuralları

1. **JWT** içinde `companyId` ve `userId` taşınır; her API isteğinde token doğrulanır.
2. **Liste/sorgu** yapan API’ler mutlaka `companyId` veya `userId` ile filtre uygular; filtre yoksa kullanıcı sadece kendi verisini görür.
3. **Admin** rolü: İstenirse tüm tenant’ların verisini görebilir (örn. cari listesinde `decoded.role === "admin"` özel ele alınır).

## Kod tarafında

- **Token’dan tenant almak:** `lib/getAuthUser.js` → `getAuthUser(req)` veya `lib/tenant.js` → `getTenantFromRequest(req)`.
- **Sorgu filtresi üretmek:** `lib/tenant.js` → `getTenantFilter(decoded, { isAdminSeesAll: true })`.
- Yeni API yazarken: Token doğrula → `companyId` / `userId` ile filtre uygula; admin için özel kural varsa dokümana göre uygula.

## Örnek kullanım

```js
import { getTenantFromRequest, getTenantFilter } from '@/lib/tenant';

// Token zorunlu, tenant bilgisi al
const tenant = getTenantFromRequest(req);
if (!tenant) return res.status(401).json({ message: 'Token gerekli' });

// Liste sorgusu için filtre (admin tümünü görsün istiyorsan)
const filter = { ...getTenantFilter(tenant, { isAdminSeesAll: true }) };
const items = await Model.find(filter).lean();
```

Bu sayede her kullanıcı yalnızca kendi firmasına / kendi kullanıcı kayıtlarına erişir.
