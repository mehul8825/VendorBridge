const bcrypt = require('bcryptjs');
const db = require('../models');

const setupUsers = async () => {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  const admin = await db.User.create({ name: 'System Admin', email: 'admin@vendorbridge.com', password: passwordHash, role: 'admin', status: 'active' });
  const procurement = await db.User.create({ name: 'Sarah Jenkins (Procurement)', email: 'procurement@vendorbridge.com', password: passwordHash, role: 'procurement', status: 'active' });
  const manager = await db.User.create({ name: 'Robert Davis (Finance Director)', email: 'manager@vendorbridge.com', password: passwordHash, role: 'manager', status: 'active' });
  
  const vendorUser1 = await db.User.create({ name: 'Acme Hardware Supplies', email: 'acme@vendorbridge.com', password: passwordHash, role: 'vendor', status: 'active' });
  const vendorUser2 = await db.User.create({ name: 'Apex Logistics Inc.', email: 'apex@vendorbridge.com', password: passwordHash, role: 'vendor', status: 'active' });
  const vendorUser3 = await db.User.create({ name: 'Zenith Office Furnishings', email: 'zenith@vendorbridge.com', password: passwordHash, role: 'vendor', status: 'active' });

  const acmeProfile = await db.VendorProfile.create({ userId: vendorUser1.id, companyName: 'Acme Hardware & IT Supplies Ltd.', category: 'IT & Hardware', gstNumber: '27AAAAA1111A1Z1', phone: '9876543210', contactPerson: 'John Doe', rating: 4.8, status: 'approved' });
  const apexProfile = await db.VendorProfile.create({ userId: vendorUser2.id, companyName: 'Apex Shipping & Logistics Co.', category: 'Logistics', gstNumber: '27BBBBB2222B2Z2', phone: '9876543211', contactPerson: 'Jane Smith', rating: 4.5, status: 'approved' });
  const zenithProfile = await db.VendorProfile.create({ userId: vendorUser3.id, companyName: 'Zenith Office Furnishings', category: 'Office Furniture', gstNumber: '27CCCCC3333C3Z3', phone: '9876543212', contactPerson: 'Bob Johnson', rating: 3.9, status: 'pending' });

  return { admin, procurement, manager, vendorUser1, vendorUser2, vendorUser3, acmeProfile, apexProfile, zenithProfile };
};

exports.resetClean = async (req, res) => {
  try {
    await db.sequelize.sync({ force: true });
    await setupUsers();
    res.json({ message: 'Database reset to clean state with basic users.' });
  } catch (error) {
    res.status(500).json({ message: 'Demo reset failed', error: error.message });
  }
};

exports.fastForward = async (req, res) => {
  try {
    await db.sequelize.sync({ force: true });
    const u = await setupUsers();
    
    // Simulate flow
    const rfq1 = await db.RFQ.create({ title: 'Procurement of 15 Developer Laptops', productDetails: JSON.stringify({ description: '32GB RAM, 1TB SSD', category: 'IT & Hardware' }), quantity: 15, targetBudget: 2250000, deadline: '2026-06-25', status: 'open', createdBy: u.procurement.id });
    const rfq2 = await db.RFQ.create({ title: 'Bulk Cargo Shipping', productDetails: JSON.stringify({ description: 'Logistics Transport', category: 'Logistics' }), quantity: 1, targetBudget: 150000, deadline: '2026-06-18', status: 'open', createdBy: u.procurement.id });
    const rfq3 = await db.RFQ.create({ title: 'Boardroom Renovation', productDetails: JSON.stringify({ description: 'Conference furniture', category: 'Office Furniture' }), quantity: 1, targetBudget: 400000, deadline: '2026-05-15', status: 'awarded', createdBy: u.procurement.id });

    await db.RFQAssignment.create({ rfqId: rfq1.id, vendorId: u.acmeProfile.id });
    await db.RFQAssignment.create({ rfqId: rfq2.id, vendorId: u.apexProfile.id });
    await db.RFQAssignment.create({ rfqId: rfq3.id, vendorId: u.acmeProfile.id });
    await db.RFQAssignment.create({ rfqId: rfq3.id, vendorId: u.zenithProfile.id });

    const quote1 = await db.Quotation.create({ rfqId: rfq1.id, vendorId: u.acmeProfile.id, price: 2150000, deliveryDays: 7, notes: 'Includes 3-year warranty.', status: 'submitted' });
    const quoteZenith = await db.Quotation.create({ rfqId: rfq3.id, vendorId: u.zenithProfile.id, price: 320000, deliveryDays: 10, notes: 'Solid mahogany.', status: 'accepted' });
    
    const po1 = await db.PurchaseOrder.create({ poNumber: 'PO-2026-0001', rfqId: rfq3.id, vendorId: u.zenithProfile.id, quotationId: quoteZenith.id, totalAmount: 320000, status: 'accepted' });
    
    const subtotal = 320000;
    const taxAmount = subtotal * 0.18;
    const invoice1 = await db.Invoice.create({ invoiceNumber: 'INV-2026-0001', poId: po1.id, vendorId: u.zenithProfile.id, subtotal, taxAmount, totalAmount: subtotal + taxAmount, status: 'paid', invoiceDate: '2026-05-20', dcNumber: 'DC-2026-0001', invoicedQuantity: 1, selectedItems: JSON.stringify(['Item Unit #1']), barcode: JSON.stringify({ STATUS: 'GATE_PASS_APPROVED' }) });

    await db.Approval.create({ entityType: 'quotation', entityId: quoteZenith.id, managerId: u.manager.id, status: 'approved', remarks: 'Lowest price.' });
    await db.Approval.create({ entityType: 'quotation', entityId: quote1.id, managerId: u.manager.id, status: 'pending', remarks: 'Awaiting review.' });

    await db.ActivityLog.create({ userId: u.procurement.id, action: 'RFQ_CREATED', details: 'Created RFQ for Boardroom Renovation' });
    await db.ActivityLog.create({ userId: u.manager.id, action: 'INVOICE_PAID', details: 'Paid INV-2026-0001' });

    res.json({ message: 'Fast-forward simulation completed successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Fast forward failed', error: error.message });
  }
};
