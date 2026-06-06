const { Invoice, PurchaseOrder, RFQ, VendorProfile, User, ActivityLog, Notification } = require('../models');
const nodemailer = require('nodemailer');

const sendInvoiceEmailHelper = async (to, subject, htmlContent) => {
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error("SMTP credentials are not fully configured in the environment variables. Please update your .env file with SMTP_HOST, SMTP_USER, and SMTP_PASS to enable email dispatch.");
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    const info = await transporter.sendMail({
      from: '"VendorBridge ERP" <no-reply@vendorbridge.com>',
      to,
      subject,
      html: htmlContent
    });

    return { success: true, messageId: info.messageId, previewUrl: null };
  } catch (error) {
    console.error('Nodemailer failed:', error.message);
    throw error;
  }
};

// Generate a simple CSS barcode string (used for visual rendering)
const generateBarcodePayload = (invoice, po, rfq, vendor) => {
  const payload = {
    INVOICE_NO: invoice.invoiceNumber,
    INVOICE_DATE: invoice.invoiceDate,
    DC_NO: invoice.dcNumber || 'N/A',
    DC_DATE: invoice.dcDate || 'N/A',
    VENDOR: vendor.companyName,
    GSTIN: vendor.gstNumber,
    PHONE: vendor.phone,
    CONTACT: vendor.contactPerson,
    PO_NUMBER: po.poNumber,
    PROJECT: rfq.title,
    ITEMS_SELECTED: invoice.invoicedQuantity,
    TOTAL_QTY: rfq.quantity,
    SUBTOTAL: parseFloat(invoice.subtotal).toFixed(2),
    TAX: parseFloat(invoice.taxAmount).toFixed(2),
    TOTAL: parseFloat(invoice.totalAmount).toFixed(2),
    STATUS: 'GATE_PASS_APPROVED',
    ISSUED_AT: new Date().toISOString()
  };
  return JSON.stringify(payload);
};

// POST /invoices/generate
exports.generateInvoice = async (req, res) => {
  try {
    const { poId, invoiceNumber, invoiceDate, dcNumber, dcDate, selectedItems } = req.body;

    if (!poId) return res.status(400).json({ message: 'Purchase Order ID is required' });
    if (!invoiceNumber) return res.status(400).json({ message: 'Invoice number is required' });
    if (!invoiceDate) return res.status(400).json({ message: 'Invoice date is required' });
    if (!selectedItems || !Array.isArray(selectedItems) || selectedItems.length === 0) {
      return res.status(400).json({ message: 'Select at least one item to invoice' });
    }

    const po = await PurchaseOrder.findByPk(poId, {
      include: [{ model: RFQ, as: 'rfq' }, { model: VendorProfile, as: 'vendor' }]
    });

    if (!po) return res.status(404).json({ message: 'Purchase Order not found' });

    if (po.status !== 'approved' && po.status !== 'accepted') {
      return res.status(400).json({ message: 'Cannot generate invoice for a PO that is not approved/accepted.' });
    }

    // Allow multiple invoices for partial delivery — check for duplicate invoice number only
    const existingInvoiceNum = await Invoice.findOne({ where: { invoiceNumber } });
    if (existingInvoiceNum) {
      return res.status(400).json({ message: 'An invoice with this number already exists. Use a unique invoice number.' });
    }

    const unitPrice = parseFloat(po.totalAmount) / (po.rfq?.quantity || 1);
    const subtotal = unitPrice * selectedItems.length;
    const taxRate = 0.18;
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    const invoice = await Invoice.create({
      invoiceNumber,
      poId,
      vendorId: po.vendorId,
      subtotal,
      taxAmount,
      totalAmount,
      status: 'pending_approval',
      invoiceDate,
      dcNumber: dcNumber || null,
      dcDate: dcDate || null,
      invoicedQuantity: selectedItems.length,
      selectedItems: JSON.stringify(selectedItems)
    });

    await ActivityLog.create({
      userId: req.user.id,
      action: 'INVOICE_GENERATED',
      details: `Vendor submitted Invoice ${invoiceNumber} for PO ${po.poNumber} (${selectedItems.length} of ${po.rfq?.quantity} items)`
    });

    // Notify the RFQ creator (procurement officer)
    if (po.rfq?.createdBy) {
      await Notification.create({
        userId: po.rfq.createdBy,
        message: `Invoice ${invoiceNumber} submitted by ${po.vendor?.companyName} for PO ${po.poNumber}. Pending your approval.`,
        type: 'warning'
      });
    }

    res.status(201).json(invoice);
  } catch (error) {
    console.error('Generate Invoice Error:', error);
    res.status(500).json({ message: 'Failed to generate invoice' });
  }
};

// PUT /invoices/:id/approve
exports.approveInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findByPk(id, {
      include: [
        { model: VendorProfile, as: 'vendor', include: [{ model: User, as: 'user' }] },
        { model: PurchaseOrder, as: 'purchaseOrder', include: [{ model: RFQ, as: 'rfq' }] }
      ]
    });

    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (invoice.status !== 'pending_approval') {
      return res.status(400).json({ message: 'Invoice is not pending approval.' });
    }

    // Generate barcode payload
    const barcodeData = generateBarcodePayload(
      invoice,
      invoice.purchaseOrder,
      invoice.purchaseOrder.rfq,
      invoice.vendor
    );

    invoice.status = 'approved';
    invoice.barcode = barcodeData;
    await invoice.save();

    await ActivityLog.create({
      userId: req.user.id,
      action: 'INVOICE_APPROVED',
      details: `Approved Invoice ${invoice.invoiceNumber} for PO ${invoice.purchaseOrder.poNumber}. Barcode generated.`
    });

    // Notify vendor
    if (invoice.vendor?.userId) {
      await Notification.create({
        userId: invoice.vendor.userId,
        message: `Your Invoice ${invoice.invoiceNumber} has been approved! Your gate pass barcode is ready for delivery.`,
        type: 'success'
      });
    }

    // Send confirmation email to vendor
    const vendorEmail = invoice.vendor?.user?.email;
    const rfqTitle = invoice.purchaseOrder?.rfq?.title || 'Procurement Project';
    const poNumber = invoice.purchaseOrder?.poNumber;
    const selectedItemsParsed = (() => {
      try { return JSON.parse(invoice.selectedItems || '[]'); } catch { return []; }
    })();

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: auto; border: 1px solid #ddd; padding: 28px; border-radius: 10px; background: #f9fafb;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 3px solid #4f46e5;">
          <h2 style="color: #4f46e5; margin: 0; font-size: 1.6rem;">✅ Invoice Approved</h2>
          <p style="color: #6b7280; font-size: 0.9rem; margin-top: 6px;">VendorBridge Procurement ERP</p>
        </div>
        <p style="margin-top: 20px; font-size: 1rem;">Dear <strong>${invoice.vendor?.companyName}</strong>,</p>
        <p style="color: #374151; font-size: 0.95rem;">Your invoice has been reviewed and <span style="color: #10b981; font-weight: bold;">APPROVED</span> by the Procurement Officer. A gate pass barcode has been generated for your delivery.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 0.88rem;">
          <tr style="background: #ede9fe;"><td style="padding: 10px; font-weight: bold; width: 40%;">Invoice Number</td><td style="padding: 10px;">${invoice.invoiceNumber}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Purchase Order</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${poNumber}</td></tr>
          <tr style="background: #f3f4f6;"><td style="padding: 10px; font-weight: bold;">Project / RFQ</td><td style="padding: 10px;">${rfqTitle}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Invoice Date</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${invoice.invoiceDate}</td></tr>
          <tr style="background: #f3f4f6;"><td style="padding: 10px; font-weight: bold;">DC Number</td><td style="padding: 10px;">${invoice.dcNumber || 'N/A'}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">DC Date</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${invoice.dcDate || 'N/A'}</td></tr>
          <tr style="background: #f3f4f6;"><td style="padding: 10px; font-weight: bold;">Items Dispatching</td><td style="padding: 10px;">${invoice.invoicedQuantity} unit(s)</td></tr>
          <tr><td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Total Amount</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #4f46e5; font-weight: bold;">₹${parseFloat(invoice.totalAmount).toLocaleString('en-IN')}</td></tr>
        </table>
        <div style="margin-top: 24px; background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="color: #065f46; font-weight: bold; margin: 0; font-size: 1rem;">🎫 GATE PASS APPROVED</p>
          <p style="color: #047857; font-size: 0.85rem; margin-top: 6px;">Present the barcode in the VendorBridge app at the delivery gate for clearance.</p>
        </div>
        <p style="margin-top: 24px; font-size: 0.78rem; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; text-align: center;">
          This email was sent automatically by VendorBridge ERP. Do not reply to this email.
        </p>
      </div>
    `;

    if (vendorEmail) {
      await sendInvoiceEmailHelper(
        vendorEmail,
        `✅ Invoice ${invoice.invoiceNumber} Approved — Gate Pass Ready | VendorBridge`,
        htmlContent
      );
    }

    res.json({
      message: 'Invoice approved successfully. Gate pass barcode generated and email sent.',
      invoice
    });
  } catch (error) {
    console.error('Approve Invoice Error:', error);
    res.status(500).json({ message: 'Failed to approve invoice' });
  }
};

exports.getInvoices = async (req, res) => {
  try {
    const role = req.user.role;
    let invoices;

    if (role === 'vendor') {
      const profile = req.vendorProfile;
      if (!profile) return res.json([]);

      invoices = await Invoice.findAll({
        where: { vendorId: profile.id },
        include: [{ model: PurchaseOrder, as: 'purchaseOrder', include: [{ model: RFQ, as: 'rfq' }] }],
        order: [['createdAt', 'DESC']]
      });
    } else {
      invoices = await Invoice.findAll({
        include: [
          { model: VendorProfile, as: 'vendor' },
          { model: PurchaseOrder, as: 'purchaseOrder', include: [{ model: RFQ, as: 'rfq' }] }
        ],
        order: [['createdAt', 'DESC']]
      });
    }

    res.json(invoices);
  } catch (error) {
    console.error('Fetch Invoices Error:', error);
    res.status(500).json({ message: 'Failed to fetch invoices' });
  }
};

exports.getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findByPk(id, {
      include: [
        { model: VendorProfile, as: 'vendor', include: [{ model: User, as: 'user' }] },
        { model: PurchaseOrder, as: 'purchaseOrder', include: [{ model: RFQ, as: 'rfq', include: [{ model: User, as: 'creator' }] }] }
      ]
    });

    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    if (req.user.role === 'vendor' && invoice.vendorId !== req.vendorProfile.id) {
      return res.status(403).json({ message: 'Not authorized to view this invoice' });
    }

    res.json(invoice);
  } catch (error) {
    console.error('Fetch Invoice ID Error:', error);
    res.status(500).json({ message: 'Failed to fetch invoice' });
  }
};

exports.payInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findByPk(id, {
      include: [{ model: VendorProfile, as: 'vendor' }, { model: PurchaseOrder, as: 'purchaseOrder' }]
    });

    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    invoice.status = 'paid';
    await invoice.save();

    await ActivityLog.create({
      userId: req.user.id,
      action: 'INVOICE_PAID',
      details: `Paid Invoice ${invoice.invoiceNumber} of INR ${invoice.totalAmount}`
    });

    await Notification.create({
      userId: invoice.vendor.userId,
      message: `Your Invoice ${invoice.invoiceNumber} has been processed and paid!`,
      type: 'success'
    });

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Failed to pay invoice' });
  }
};

exports.sendInvoiceEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    if (!email) return res.status(400).json({ message: 'Recipient email address is required' });

    const invoice = await Invoice.findByPk(id, {
      include: [
        { model: VendorProfile, as: 'vendor' },
        { model: PurchaseOrder, as: 'purchaseOrder', include: [{ model: RFQ, as: 'rfq' }] }
      ]
    });

    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
        <h2 style="color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">VendorBridge Invoice</h2>
        <p>Hi,</p>
        <p>Please find details of your generated invoice below:</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Invoice Number:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${invoice.invoiceNumber}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Purchase Order:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${invoice.purchaseOrder.poNumber}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Vendor:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${invoice.vendor.companyName}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Date:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${invoice.invoiceDate}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">DC Number:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${invoice.dcNumber || 'N/A'}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Items Invoiced:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${invoice.invoicedQuantity} unit(s)</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Subtotal:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">INR ${parseFloat(invoice.subtotal).toLocaleString('en-IN')}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Tax (18% GST):</td><td style="padding: 8px; border-bottom: 1px solid #eee;">INR ${parseFloat(invoice.taxAmount).toLocaleString('en-IN')}</td></tr>
          <tr style="background: #f9fafb;"><td style="padding: 8px; font-weight: bold;">Total Amount:</td><td style="padding: 8px; font-weight: bold; color: #4f46e5;">INR ${parseFloat(invoice.totalAmount).toLocaleString('en-IN')}</td></tr>
        </table>
        <p style="margin-top: 20px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 10px;">
          This is an automated invoice document sent via VendorBridge Procurement ERP.
        </p>
      </div>
    `;

    const mailResult = await sendInvoiceEmailHelper(email, `Invoice ${invoice.invoiceNumber} - VendorBridge ERP`, htmlContent);

    await ActivityLog.create({
      userId: req.user.id,
      action: 'INVOICE_EMAIL_SENT',
      details: `Sent Invoice ${invoice.invoiceNumber} to ${email} (Success: ${mailResult.success})`
    });

    res.json({
      message: `Invoice email successfully sent to ${email}`,
      mocked: mailResult.mocked,
      previewUrl: mailResult.previewUrl
    });
  } catch (error) {
    console.error('Send Invoice Email Error:', error);
    res.status(500).json({ message: 'Failed to send invoice email' });
  }
};
