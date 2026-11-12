import mongoose from "mongoose";

const validCurrency = value => {
  if (!/^[A-Z]{3}$/.test(value)) return false;
  return typeof Intl.supportedValuesOf !== "function" ||
    Intl.supportedValuesOf("currency").includes(value);
};
const validTimeZone = value => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
};

const companySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 160 },
  legalName: { type: String, required: true, trim: true, maxlength: 200 },
  entityType: {
    type: String,
    required: true,
    enum: ["private_limited", "public_limited", "government_department", "public_sector_undertaking", "partnership", "llp", "sole_proprietorship", "non_profit", "other"]
  },
  countryCode: { type: String, required: true, uppercase: true, match: /^[A-Z]{2}$/ },
  functionalCurrency: { type: String, required: true, uppercase: true, validate: { validator: validCurrency, message: "Unsupported functional currency code" } },
  reportingCurrency: { type: String, required: true, uppercase: true, validate: { validator: validCurrency, message: "Unsupported reporting currency code" } },
  fiscalYearStartMonth: { type: Number, required: true, min: 1, max: 12, validate: Number.isInteger },
  timeZone: { type: String, required: true, trim: true, maxlength: 80, validate: { validator: validTimeZone, message: "Invalid IANA time-zone identifier" } },
  taxJurisdictions: {
    type: [{ type: String, uppercase: true, trim: true, match: /^[A-Z0-9-]{2,12}$/ }],
    default: [],
    validate: value => value.length <= 20
  },
  status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
  configurationVersion: { type: Number, required: true, default: 1, min: 1 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true, strict: "throw" });

companySchema.index({ createdBy: 1, createdAt: -1 });
export default mongoose.models.EnterpriseCompany || mongoose.model("EnterpriseCompany", companySchema);
