import test from "node:test";
import assert from "node:assert/strict";
import { getHRPermission } from "../enterprise/hrAuthorization.js";

test("HR read routes require employee read permission", () => {
  assert.equal(getHRPermission("GET", "/employees"), "hr.employee.read");
  assert.equal(getHRPermission("GET", "/attendance"), "hr.employee.read");
  assert.equal(getHRPermission("GET", "/leaves"), "hr.employee.read");
  assert.equal(getHRPermission("GET", "/payroll-attendance-summary"), "hr.employee.read");
});

test("payroll and challan reads require payroll preparation permission", () => {
  assert.equal(getHRPermission("GET", "/payroll-runs"), "hr.payroll.prepare");
  assert.equal(getHRPermission("GET", "/challans"), "hr.payroll.prepare");
});

test("HR writes require employee management permission", () => {
  assert.equal(getHRPermission("POST", "/employees"), "hr.employee.manage");
  assert.equal(getHRPermission("POST", "/attendance"), "hr.employee.manage");
  assert.equal(getHRPermission("PATCH", "/leaves/123/review"), "hr.employee.manage");
});

test("payroll creation and challan writes require preparation permission", () => {
  assert.equal(getHRPermission("POST", "/payroll-runs"), "hr.payroll.prepare");
  assert.equal(getHRPermission("POST", "/challans"), "hr.payroll.prepare");
  assert.equal(getHRPermission("DELETE", "/challans/123"), "hr.payroll.prepare");
});

test("payroll status transitions require explicit approval permission", () => {
  assert.equal(getHRPermission("PATCH", "/payroll-runs/123/status"), "hr.payroll.approve");
});
