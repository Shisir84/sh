import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  addToCart,
  buildDeliveryCommands,
  buildOrderReceiptText,
  calculateCartSummary,
  convertInrAmount,
  createCartOrderPayload,
  filterStoreProducts,
  formatCurrencyPrice,
  groupInventoryFromOrders,
  maskPlayerName,
  validateAndApplyCoupon,
  validateMinecraftUsername,
} from './storeLogic.ts';
import { DEFAULT_COUPONS, DEFAULT_PAYMENT_METHODS, DEFAULT_PRODUCTS } from '../data/seedData.ts';
import type { OrderItem } from '../types/store.ts';

describe('storeLogic pure helpers', () => {
  it('converts and formats INR and NPR prices deterministically', () => {
    assert.equal(convertInrAmount(500, 'INR', 1.6), 500);
    assert.equal(convertInrAmount(500, 'NPR', 1.6), 800);
    assert.equal(formatCurrencyPrice(499, 'INR', 1.6), '₹499 INR');
    assert.equal(formatCurrencyPrice(500, 'NPR', 1.6), 'रू 800 NPR');
  });

  it('validates and applies percent & fixed coupons safely', () => {
    const validPct = validateAndApplyCoupon({
      code: 'volex10',
      coupons: DEFAULT_COUPONS,
      subtotalInr: 500,
    });
    assert.equal(validPct.valid, true);
    assert.equal(validPct.discountInr, 50);
    assert.equal(validPct.finalTotalInr, 450);

    const tooLow = validateAndApplyCoupon({
      code: 'VOLEX10',
      coupons: DEFAULT_COUPONS,
      subtotalInr: 199,
    });
    assert.equal(tooLow.valid, false);
    assert.match(tooLow.error || '', /Minimum order/);

    const expired = validateAndApplyCoupon({
      code: 'OLD',
      coupons: [
        {
          id: 'old',
          code: 'OLD',
          description: 'Expired',
          discountType: 'fixed',
          discountValue: 100,
          minOrderInr: 50,
          maxUses: 10,
          usedCount: 0,
          expiresAt: '2020-01-01T00:00:00.000Z',
          active: true,
        },
      ],
      subtotalInr: 500,
      now: new Date('2026-11-20T00:00:00.000Z'),
    });
    assert.equal(expired.valid, false);
  });

  it('filters and sorts store products across price, category, limited, and popular filters', () => {
    const special = filterStoreProducts(DEFAULT_PRODUCTS, { category: 'Special Items' });
    assert.equal(special.length, 1);
    assert.equal(special[0].id, 'voidblade-relic');

    const bundles = filterStoreProducts(DEFAULT_PRODUCTS, { category: 'Bundles' });
    assert.equal(bundles.length, 1);
    assert.equal(bundles[0].id, 'obsidian-starter-bundle');

    const capped = filterStoreProducts(DEFAULT_PRODUCTS, {
      maxPriceInr: 300,
      sortBy: 'price-asc',
    });
    assert.ok(capped.length >= 3);
    assert.ok(capped[0].priceInr <= capped[1].priceInr);
    assert.ok(capped.every((p) => p.priceInr <= 300));
  });

  it('masks player names for privacy-protected recent purchases', () => {
    assert.equal(maskPlayerName('Shisir'), 'Sh***r');
    assert.equal(maskPlayerName('AetherBlade'), 'Aet***de');
    assert.equal(maskPlayerName('Ab'), 'A**');
  });

  it('validates Minecraft IGN and interpolates delivery commands safely', () => {
    assert.equal(validateMinecraftUsername('Steve_123').valid, true);
    assert.equal(validateMinecraftUsername('bad name!').valid, false);

    const vip = DEFAULT_PRODUCTS.find((p) => p.id === 'vip-rank')!;
    const cmds = buildDeliveryCommands(vip, 'DragonSlayer_7', 2);
    assert.ok(cmds[0].includes('DragonSlayer_7'));

    assert.throws(() => buildDeliveryCommands(vip, 'bad;cmd', 1), /Username/);
  });

  it('builds discounted cart order payloads & formats receipts', () => {
    const vip = DEFAULT_PRODUCTS.find((p) => p.id === 'vip-rank')!;
    const key = DEFAULT_PRODUCTS.find((p) => p.id === 'enchanted-key-pack')!;
    let cart = addToCart([], vip, 1);
    cart = addToCart(cart, key, 2);
    const summary = calculateCartSummary(cart);
    assert.equal(summary.totalInr, 499 + 149 * 2);

    const payload = createCartOrderPayload({
      id: 'ORD-TEST-1',
      userId: 'user-1',
      minecraftUsername: 'VolexKnight',
      items: cart,
      paymentMethod: DEFAULT_PAYMENT_METHODS[0],
      paymentProofUrl: 'data:image/png;base64,AAA',
      couponCode: 'VOLEX10',
      discountInr: 80,
      currencyDisplayed: 'NPR',
    });

    assert.equal(payload.subtotalInr, summary.totalInr);
    assert.equal(payload.amountInr, summary.totalInr - 80);
    assert.equal(payload.couponCode, 'VOLEX10');

    const receipt = buildOrderReceiptText({
      ...payload,
      status: 'Delivered',
      createdAt: '2026-11-20T12:00:00.000Z',
    } as OrderItem);
    assert.match(receipt, /VOLEXMC STORE RECEIPT/);
    assert.match(receipt, /VOLEX10/);
  });

  it('groups approved/delivered orders into inventory categories and excludes approved refunds', () => {
    const orders: OrderItem[] = [
      {
        id: 'o1',
        userId: 'u1',
        minecraftUsername: 'Shisir',
        productId: 'vip-rank',
        productName: 'VIP RANK',
        items: [{ productId: 'vip-rank', productName: 'VIP RANK', quantity: 1, priceInr: 499 }],
        amountInr: 499,
        paymentMethodId: 'esewa',
        paymentMethodName: 'eSewa',
        paymentProofUrl: 'data:image/png;base64,A',
        status: 'Delivered',
        createdAt: '2026-11-20T10:00:00.000Z',
      },
      {
        id: 'o2',
        userId: 'u1',
        minecraftUsername: 'Shisir',
        productId: 'dragon-pet',
        productName: 'DRAGON PET',
        items: [{ productId: 'dragon-pet', productName: 'DRAGON PET', quantity: 1, priceInr: 299 }],
        amountInr: 299,
        paymentMethodId: 'esewa',
        paymentMethodName: 'eSewa',
        paymentProofUrl: 'data:image/png;base64,A',
        status: 'Approved',
        refundStatus: 'Approved',
        createdAt: '2026-11-20T11:00:00.000Z',
      },
    ];

    const grouped = groupInventoryFromOrders(orders, DEFAULT_PRODUCTS);
    assert.equal(grouped.length, 1);
    assert.equal(grouped[0].group, 'Ranks');
    assert.equal(grouped[0].items[0].productId, 'vip-rank');
  });
});
