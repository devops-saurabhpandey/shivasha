import mongoose from "mongoose";

export const PRODUCT_MEMBERSHIP_PRODUCTS = Object.freeze([
  "social",
  "business",
  "edutech",
  "enterprise"
]);

export const PRODUCT_MEMBERSHIP_STATUSES = Object.freeze([
  "pending",
  "active",
  "suspended",
  "revoked"
]);

export const PRODUCT_MEMBERSHIP_ROLES = Object.freeze([
  "social_member",
  "social_creator",
  "social_moderator",
  "social_admin",
  "business_owner",
  "business_admin",
  "business_staff",
  "business_freelancer",
  "edutech_learner",
  "edutech_guardian",
  "edutech_educator",
  "edutech_institution_admin",
  "enterprise_company_owner",
  "enterprise_company_admin",
  "enterprise_hr_manager",
  "enterprise_finance_manager",
  "enterprise_employee",
  "enterprise_read_only"
]);

const productMembershipSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  productId: {
    type: String,
    enum: PRODUCT_MEMBERSHIP_PRODUCTS,
    required: true
  },
  // Tenant IDs are intentionally polymorphic across product domains.
  // Resolve and authorize the owning tenant in the relevant service.
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  role: {
    type: String,
    enum: PRODUCT_MEMBERSHIP_ROLES,
    required: true
  },
  // Explicit grants only. Do not derive permissions from client input.
  permissions: {
    type: [{ type: String, trim: true, minlength: 1, maxlength: 120 }],
    default: []
  },
  status: {
    type: String,
    enum: PRODUCT_MEMBERSHIP_STATUSES,
    default: "pending",
    index: true
  },
  grantedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  expiresAt: {
    type: Date,
    default: null
  },
  revokedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  strict: "throw"
});

// Separate partial unique indexes avoid MongoDB's null/missing-value
// uniqueness ambiguity while allowing one product-level and many
// tenant-specific memberships per user.
productMembershipSchema.index(
  { userId: 1, productId: 1 },
  {
    unique: true,
    partialFilterExpression: { tenantId: { $type: "null" } },
    name: "uniq_product_level_membership"
  }
);
productMembershipSchema.index(
  { userId: 1, productId: 1, tenantId: 1 },
  {
    unique: true,
    partialFilterExpression: { tenantId: { $type: "objectId" } },
    name: "uniq_tenant_product_membership"
  }
);
productMembershipSchema.index(
  { userId: 1, productId: 1, status: 1 },
  { name: "product_membership_lookup" }
);

export default mongoose.models.ProductMembership
  || mongoose.model("ProductMembership", productMembershipSchema);
