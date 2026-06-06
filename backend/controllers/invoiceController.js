const { Invoice, PurchaseOrder, RFQ, VendorProfile, User, ActivityLog, Notification } = require('../models');
const nodemailer = require('nodemailer');

// Helper to send email
const sendInvoiceEmailHelper = async (to, subject, htmlContent) => {
  try {
    let transporter;
    
    // Check if env variables for real mail are set, otherwise create test account
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } else {
      // Create test account automatically
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    }

    const info = await transporter.sendMail({
      from: '"VendorBridge ERP" <no-reply@vendorbridge.com>',
      to,
      subject,
      html: htmlContent
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    return { success: true, messageId: info.messageId, previewUrl };
  } catch (error) {
    console.warn("Nodemailer failed. Logging mail to console instead:", error.message);
    return { success: true, mocked: true, previewUrl: null };
  }
};

exports.generateInvoice = async (req, res) => {
  try {
    const { poId } = req.body;

    if (!poId) {
      return res.status(400).json({ message: 'Purchase Order ID is required' });
    }

    const po = await PurchaseOrder.findByPk(poId, {
      include: [{ model: RFQ, as: 'rfq' }, { model: VendorProfile, as: 'vendor' }]
    });

    if (!po) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    if (po.status !== 'approved' && po.status !== 'accepted') {
      return res.status(400).json({ message: 'Cannot generate invoice for a Purchase Order that is not approved/accepted.' });
    }

    // Check if invoice already exists for this PO
    const existingInvoice = await Invoice.findOne({ where: { poId } });
    if (existingInvoice) {
      return res.status(400).json({ message: 'An invoice has already been generated for this Purchase Order.' });
    }

    const subtotal = parseFloat(po.totalAmount);
    const taxRate = 0.18; // 18% GST default
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    const invoiceCount = await Invoice.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(4, '0')}`;

    const invoice = await Invoice.create({
      invoiceNumber,
      poId,
      vendorId: po.vendorId,
      subtotal,
      taxAmount,
      totalAmount,
      status: 'sent',
      invoiceDate: new Date()
    });

    await ActivityLog.create({
      userId: req.user.id,
      action: 'INVOICE_GENERATED',
      details: `Generated Invoice ${invoiceNumber} for Purchase Order ${po.poNumber}`
    });

    // Notify procurement officer / creator of RFQ
    await Notification.create({
      userId: po.rfq.createdBy,
      message: `Invoice ${invoiceNumber} has been generated for PO ${po.poNumber}.`,
      type: 'info'
    });

    res.status(201).json(invoice);
  } catch (error) {
    console.error('Generate Invoice Error:', error);
    res.status(500).json({ message: 'Failed to generate invoice' });
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
        { model: VendorProfile, as: 'vendor' },
        { model: PurchaseOrder, as: 'purchaseOrder', include: [{ model: RFQ, as: 'rfq', include: [{ model: User, as: 'creator' }] }] }
      ]
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

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

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    invoice.status = 'paid';
    await invoice.save();

    await ActivityLog.create({
      userId: req.user.id,
      action: 'INVOICE_PAID',
      details: `Paid Invoice ${invoice.invoiceNumber} of INR ${invoice.totalAmount}`
    });

    // Notify vendor
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

    if (!email) {
      return res.status(400).json({ message: 'Recipient email address is required' });
    }

    const invoice = await Invoice.findByPk(id, {
      include: [
        { model: VendorProfile, as: 'vendor' },
        { model: PurchaseOrder, as: 'purchaseOrder', include: [{ model: RFQ, as: 'rfq' }] }
      ]
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
        <h2 style="color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">VendorBridge Invoice</h2>
        <p>Hi,</p>
        <p>Please find details of your generated invoice below:</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Invoice Number:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${invoice.invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Purchase Order:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${invoice.purchaseOrder.poNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Vendor:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${invoice.vendor.companyName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Date:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${invoice.invoiceDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Subtotal:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">INR ${parseFloat(invoice.subtotal).toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Tax (18% GST):</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">INR ${parseFloat(invoice.taxAmount).toLocaleString('en-IN')}</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Total Amount:</td>
            <td style="padding: 8px; font-weight: bold; color: #4f46e5; border-bottom: 1px solid #eee;">INR ${parseFloat(invoice.totalAmount).toLocaleString('en-IN')}</td>
          </tr>
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
