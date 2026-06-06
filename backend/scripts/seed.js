const bcrypt = require('bcryptjs');
const db = require('../models');

const seedDatabase = async () => {
  try {
    console.log('Starting Database Seeding...');
    
    // Initialize DB connection
    await db.sequelize.init();

    // Sync database (recreate tables)
    await db.sequelize.sync({ force: true });
    console.log('Database schemas cleared and recreated.');

    // 1. Create Users
    console.log('Creating users...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    const admin = await db.User.create({
      name: 'System Admin',
      email: 'admin@vendorbridge.com',
      password: passwordHash,
      role: 'admin',
      status: 'active'
    });

    const procurement = await db.User.create({
      name: 'Sarah Jenkins (Procurement)',
      email: 'procurement@vendorbridge.com',
      password: passwordHash,
      role: 'procurement',
      status: 'active'
    });

    const manager = await db.User.create({
      name: 'Robert Davis (Finance Director)',
      email: 'manager@vendorbridge.com',
      password: passwordHash,
      role: 'manager',
      status: 'active'
    });

    // Vendor users
    const vendorUser1 = await db.User.create({
      name: 'Acme Hardware Supplies',
      email: 'acme@vendorbridge.com',
      password: passwordHash,
      role: 'vendor',
      status: 'active'
    });

    const vendorUser2 = await db.User.create({
      name: 'Apex Logistics Inc.',
      email: 'apex@vendorbridge.com',
      password: passwordHash,
      role: 'vendor',
      status: 'active'
    });

    const vendorUser3 = await db.User.create({
      name: 'Zenith Office Furnishings',
      email: 'zenith@vendorbridge.com',
      password: passwordHash,
      role: 'vendor',
      status: 'active'
    });

    console.log('Users created.');

    // 2. Create Vendor Profiles
    console.log('Creating vendor profiles...');
    const acmeProfile = await db.VendorProfile.create({
      userId: vendorUser1.id,
      companyName: 'Acme Hardware & IT Supplies Ltd.',
      category: 'IT & Hardware',
      gstNumber: '27AAAAA1111A1Z1',
      phone: '9876543210',
      contactPerson: 'John Doe',
      rating: 4.8,
      status: 'approved'
    });

    const apexProfile = await db.VendorProfile.create({
      userId: vendorUser2.id,
      companyName: 'Apex Shipping & Logistics Co.',
      category: 'Logistics',
      gstNumber: '27BBBBB2222B2Z2',
      phone: '9876543211',
      contactPerson: 'Jane Smith',
      rating: 4.5,
      status: 'approved'
    });

    const zenithProfile = await db.VendorProfile.create({
      userId: vendorUser3.id,
      companyName: 'Zenith Office Furnishings',
      category: 'Office Furniture',
      gstNumber: '27CCCCC3333C3Z3',
      phone: '9876543212',
      contactPerson: 'Bob Johnson',
      rating: 3.9,
      status: 'pending' // Zenith is pending onboarding
    });

    console.log('Vendor profiles created.');

    // 3. Create RFQs
    console.log('Creating RFQs...');
    
    // RFQ 1: Open, IT Laptops
    const rfq1 = await db.RFQ.create({
      title: 'Procurement of 15 Developer Laptops',
      productDetails: JSON.stringify({
        description: 'Laptops with 32GB RAM, 1TB SSD, Apple M3 Pro or equivalent Intel i7 processor, 16-inch display.',
        category: 'IT & Hardware'
      }),
      quantity: 15,
      targetBudget: 2250000.00,
      deadline: '2026-06-25',
      status: 'open',
      createdBy: procurement.id
    });

    // RFQ 2: Open, Logistics Shipping
    const rfq2 = await db.RFQ.create({
      title: 'Bulk Cargo Shipping - Mumbai to Bengaluru',
      productDetails: JSON.stringify({
        description: 'Transport of 25 tons of hardware equipment. Requires closed container vehicle with GPS tracking.',
        category: 'Logistics'
      }),
      quantity: 1,
      targetBudget: 150000.00,
      deadline: '2026-06-18',
      status: 'open',
      createdBy: procurement.id
    });

    // RFQ 3: Awarded, Conference Furniture
    const rfq3 = await db.RFQ.create({
      title: 'Boardroom Renovation - Conference Chairs and Tables',
      productDetails: JSON.stringify({
        description: '1 Large mahogany table (10 seater), 10 ergonomic leather mesh executive chairs.',
        category: 'Office Furniture'
      }),
      quantity: 1,
      targetBudget: 400000.00,
      deadline: '2026-05-15',
      status: 'awarded',
      createdBy: procurement.id
    });

    console.log('RFQs created.');

    // 4. Create RFQ Assignments
    console.log('Creating RFQ assignments...');
    // RFQ 1: Invite Acme
    await db.RFQAssignment.create({ rfqId: rfq1.id, vendorId: acmeProfile.id });
    
    // RFQ 2: Invite Apex
    await db.RFQAssignment.create({ rfqId: rfq2.id, vendorId: apexProfile.id });
    
    // RFQ 3: Invites Zenith and Acme
    await db.RFQAssignment.create({ rfqId: rfq3.id, vendorId: acmeProfile.id });
    await db.RFQAssignment.create({ rfqId: rfq3.id, vendorId: zenithProfile.id });

    console.log('Assignments created.');

    // 5. Create Quotations
    console.log('Creating quotations...');
    // Quotations for RFQ 1 (Laptops) - Acme submits a quote
    const quote1 = await db.Quotation.create({
      rfqId: rfq1.id,
      vendorId: acmeProfile.id,
      price: 2150000.00,
      deliveryDays: 7,
      notes: 'We can deliver in 1 week. Laptops include a 3-year commercial warranty.',
      status: 'submitted'
    });

    // Quotations for RFQ 3 (Furniture) - Zenith submitted and got approved, Acme also submitted
    const quoteAcme = await db.Quotation.create({
      rfqId: rfq3.id,
      vendorId: acmeProfile.id,
      price: 380000.00,
      deliveryDays: 14,
      notes: 'Custom mahogany veneer table. Executive mesh chairs with tilt mechanisms.',
      status: 'rejected'
    });

    const quoteZenith = await db.Quotation.create({
      rfqId: rfq3.id,
      vendorId: zenithProfile.id,
      price: 320000.00,
      deliveryDays: 10,
      notes: 'Solid mahogany conference table + 10 premium leather chairs. Ready stock available.',
      status: 'accepted'
    });

    console.log('Quotations created.');

    // 6. Create Purchase Orders
    console.log('Creating purchase orders...');
    const po1 = await db.PurchaseOrder.create({
      poNumber: 'PO-2026-0001',
      rfqId: rfq3.id,
      vendorId: zenithProfile.id,
      quotationId: quoteZenith.id,
      totalAmount: 320000.00,
      status: 'accepted' // Vendor accepted this PO
    });

    console.log('Purchase orders created.');

    // 7. Create Invoices
    console.log('Creating invoices...');
    const subtotal = 320000.00;
    const taxAmount = subtotal * 0.18; // 18% GST
    const totalAmount = subtotal + taxAmount;

    const invoice1 = await db.Invoice.create({
      invoiceNumber: 'INV-2026-0001',
      poId: po1.id,
      vendorId: zenithProfile.id,
      subtotal,
      taxAmount,
      totalAmount,
      status: 'paid',
      invoiceDate: '2026-05-20'
    });

    console.log('Invoices created.');

    // 8. Create Approvals
    console.log('Creating approvals...');
    // Create an approval record for the Zenith Quotation
    await db.Approval.create({
      entityType: 'quotation',
      entityId: quoteZenith.id,
      managerId: manager.id,
      status: 'approved',
      remarks: 'Lowest price offered and faster delivery than Acme. Approved for awarding.'
    });

    // Create a pending approval for Acme's laptop quotation to show manager workflow
    await db.Approval.create({
      entityType: 'quotation',
      entityId: quote1.id,
      managerId: manager.id,
      status: 'pending',
      remarks: 'Awaiting comparison analysis and technical team confirmation.'
    });

    console.log('Approvals created.');

    // 9. Create Activity Logs
    console.log('Creating activity logs...');
    await db.ActivityLog.create({ userId: procurement.id, action: 'RFQ_CREATED', details: 'Created RFQ for Developer Laptops (#1)' });
    await db.ActivityLog.create({ userId: procurement.id, action: 'RFQ_CREATED', details: 'Created RFQ for Regional Office Shipping (#2)' });
    await db.ActivityLog.create({ userId: procurement.id, action: 'RFQ_CREATED', details: 'Created RFQ for Boardroom Renovation (#3)' });
    await db.ActivityLog.create({ userId: vendorUser1.id, action: 'QUOTATION_SUBMITTED', details: 'Submitted bid of INR 2,150,000.00 for Laptops' });
    await db.ActivityLog.create({ userId: manager.id, action: 'BID_AWARDED', details: 'Approved bid by Zenith Office Furnishings and generated PO-2026-0001' });
    await db.ActivityLog.create({ userId: vendorUser3.id, action: 'PO_ACCEPTED_BY_VENDOR', details: 'Accepted PO-2026-0001' });
    await db.ActivityLog.create({ userId: vendorUser3.id, action: 'INVOICE_GENERATED', details: 'Generated INV-2026-0001 for PO-2026-0001' });
    await db.ActivityLog.create({ userId: manager.id, action: 'INVOICE_PAID', details: 'Paid INV-2026-0001 of INR 377,600.00 (inclusive of GST)' });

    console.log('Activity logs created.');

    // 10. Create Notifications
    console.log('Creating notifications...');
    await db.Notification.create({ userId: manager.id, message: 'New quotation approval request pending for RFQ: Developer Laptops', type: 'info' });
    await db.Notification.create({ userId: vendorUser1.id, message: 'You have been invited to submit a quotation for RFQ: Procurement of 15 Developer Laptops', type: 'info' });
    await db.Notification.create({ userId: vendorUser3.id, message: 'Your Invoice INV-2026-0001 has been processed and paid!', type: 'success' });

    console.log('Notifications created.');
    console.log('============================================');
    console.log('  Database Seeding Completed Successfully!  ');
    console.log('============================================');
    process.exit(0);
  } catch (error) {
    console.error('Database seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
