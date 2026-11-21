# VOLEXMC Firestore Security Specification

## 1. Data Invariants
1. Orders can never be created with a pre-approved status (`Approved`, `Delivered`, `Under Review`); client creation is strictly locked to `status == 'Pending'` and `userId == request.auth.uid`, referencing an existing product document.
2. Users can never self-assign admin roles (`role: 'admin'`) during registration or profile updates.
3. User profiles containing email addresses are isolated to the owner (`request.auth.uid == uid`) or verified admins; blanket `isSignedIn()` reads or `list` queries on `/users` are forbidden.
4. All timestamp fields (`createdAt`, `updatedAt`) are verified against `request.time`, and `createdAt`/`userId` are immutable after creation.
5. Support tickets are owned by `request.auth.uid`, created with `status == 'Open'`, and only admins can post `adminReply` or change `status`.
6. Public catalog & content collections (`products`, `categories`, `paymentMethods`, `siteConfig`, `staff`, `wikiArticles`, `rules`) are publicly readable, and writable strictly by verified admins (`isAdmin()`).

## 2. Dirty Dozen Attack Payloads (Expected: PERMISSION_DENIED)
1. **Self-Approved Order**: Create `/orders/ord_1` with `status: 'Approved'`.
2. **Order Identity Spoofing**: Create `/orders/ord_2` with `userId: 'victim_uid'` while signed in as `attacker_uid`.
3. **Ghost Field Shadow Write on Order**: Create `/orders/ord_3` with extra unexpected key `isPaid: true`.
4. **Non-Existent Product Reference**: Create `/orders/ord_4` referencing `productId: 'nonexistent_prod'`.
5. **User Updating Own Order Status**: Update `/orders/ord_1` as owner changing `status` to `'Delivered'`.
6. **Privilege Escalation on Profile Create**: Create `/users/attacker_uid` with `role: 'admin'`.
7. **Privilege Escalation on Profile Update**: Update `/users/attacker_uid` changing `role` from `'user'` to `'admin'`.
8. **PII Leak via Blanket User List**: Signed-in non-admin user runs `list` on `/users`.
9. **PII Leak via Other User Get**: Signed-in non-admin user calls `get` on `/users/victim_uid`.
10. **Unverified Email Spoofing**: Request where `request.auth.token.email == 'shisirtharu16@gmail.com'` but `email_verified == false` attempting product write.
11. **ID Poisoning**: Attempt to write `/products/<200-char-invalid-id!@#>` violating `isValidId()`.
12. **Support Ticket Reply Injection**: Ticket owner updates `/supportTickets/t_1` modifying `adminReply` or `status: 'Resolved'`.
