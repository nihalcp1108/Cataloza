import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../src/config';
import { User } from '../src/models/User';
import { PlatformSetting } from '../src/models/PlatformSetting';
import { SubscriptionPlan } from '../src/models/SubscriptionPlan';
import { ProductFormTemplate } from '../src/models/ProductFormTemplate';
import { ProductFormVersion, IFormFieldConfig } from '../src/models/ProductFormVersion';

async function bootstrapAdmin(): Promise<void> {
  try {
    console.log('[Bootstrap] Initializing Super Admin and platform foundation...');
    await mongoose.connect(config.mongoUri);

    const superAdminEmail = (config.superAdmin.email || '').toLowerCase().trim();
    const superAdminPassword = config.superAdmin.password || '';

    // 1. Strict validation: Both email and password must be supplied via environment
    if (!superAdminEmail || !superAdminPassword) {
      console.error(
        '[Bootstrap] ❌ Fatal: Both SUPER_ADMIN_EMAIL and SUPER_ADMIN_INITIAL_PASSWORD must be configured in environment variables.'
      );
      process.exit(1);
    }

    // 2. Inspect existing user record
    const forceReset =
      process.argv.includes('--reset-password') ||
      process.argv.includes('--force') ||
      process.argv.includes('-f') ||
      process.env.RESET_SUPER_ADMIN === 'true';

    const existingUser = await User.findOne({ email: superAdminEmail });

    if (existingUser) {
      existingUser.role = 'super_admin';
      existingUser.isActive = true;

      const isCurrentMatch = await existingUser.comparePassword(superAdminPassword);

      if (!isCurrentMatch) {
        if (forceReset) {
          console.log(`[Bootstrap] Updating Super Admin credentials for '${superAdminEmail}' to match SUPER_ADMIN_INITIAL_PASSWORD...`);
          const salt = await bcrypt.genSalt(12);
          existingUser.passwordHash = await bcrypt.hash(superAdminPassword, salt);
          existingUser.mustChangePassword = false;
          existingUser.tokenVersion = (existingUser.tokenVersion || 0) + 1;
          await existingUser.save();
          console.log(`[Bootstrap] ✅ Super Admin password updated successfully.`);
        } else {
          console.log(
            `[Bootstrap] ℹ️ Super Admin account '${superAdminEmail}' already exists with a different password.`
          );
          console.log(
            `[Bootstrap] 💡 To sync/reset the password to SUPER_ADMIN_INITIAL_PASSWORD, run:`
          );
          console.log(`            npm run reset:admin`);
          console.log(`            or: npm run bootstrap:admin -- --reset-password\n`);
        }
      } else {
        await existingUser.save();
        console.log(
          `[Bootstrap] ℹ️ Super Admin account '${superAdminEmail}' already exists and password matches SUPER_ADMIN_INITIAL_PASSWORD.`
        );
      }
    } else {
      console.log(`[Bootstrap] Creating initial Super Admin account for '${superAdminEmail}'...`);
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(superAdminPassword, salt);

      const newAdmin = await User.create({
        name: config.superAdmin.name || 'Platform Super Administrator',
        email: superAdminEmail,
        passwordHash,
        role: 'super_admin',
        isActive: true,
        mustChangePassword: true, // Enforce password change on first login
      });

      console.log(`[Bootstrap] ✅ Super Admin created with ID: ${newAdmin._id}. First-login password change enforced.`);
    }

    // Security Guarantee: Ensure ONLY the authorized Super Admin email holds the super_admin role
    await User.updateMany(
      { role: 'super_admin', email: { $ne: superAdminEmail } },
      { role: 'customer' }
    );

    // 3. Ensure Platform Settings exist
    let setting = await PlatformSetting.findOne();
    if (!setting) {
      console.log('[Bootstrap] Creating default platform settings...');
      await PlatformSetting.create({
        platformName: 'WholesaleFlow',
        supportEmail: 'support@wholesaleflow.com',
        supportPhone: '+91 98765 43210',
        maintenanceMode: false,
        defaultCurrency: 'INR',
        defaultCurrencySymbol: '₹',
      });
    }

    // 4. Ensure Default Subscription Plans exist
    const planCount = await SubscriptionPlan.countDocuments();
    if (planCount === 0) {
      console.log('[Bootstrap] Provisioning standard subscription tiers...');
      await SubscriptionPlan.create([
        {
          name: 'Starter Wholesale',
          code: 'PLAN_STARTER',
          description: 'Ideal for independent distributors getting started online',
          price: 999,
          currency: 'INR',
          billingInterval: 'monthly',
          trialDays: 14,
          maxProducts: 50,
          maxCategories: 10,
          maxAdmins: 1,
          allowCustomProductFields: false,
          allowAnalytics: false,
          allowExportInvoices: true,
          allowOnlineOrdering: true,
          isActive: true,
          displayOrder: 1,
          features: [
            'Up to 50 active products',
            '10 product categories',
            'Pre-filled WhatsApp ordering',
            'Standard PDF invoices',
            'Single Shop Admin access',
          ],
        },
        {
          name: 'Professional Distributor',
          code: 'PLAN_PRO',
          description: 'For growing suppliers requiring custom product specifications and multi-staff access',
          price: 2999,
          currency: 'INR',
          billingInterval: 'monthly',
          trialDays: 14,
          maxProducts: 500,
          maxCategories: 50,
          maxAdmins: 5,
          allowCustomProductFields: true,
          allowAnalytics: true,
          allowExportInvoices: true,
          allowOnlineOrdering: true,
          isActive: true,
          displayOrder: 2,
          features: [
            'Up to 500 active products',
            '50 product categories',
            'Dynamic custom product form builder fields',
            'Advanced sales & order analytics',
            'Up to 5 Shop Admin staff logins',
            'Priority WhatsApp ordering pipeline',
          ],
        },
        {
          name: 'Enterprise Wholesale',
          code: 'PLAN_ENTERPRISE',
          description: 'Unlimited catalog capacity with bespoke form attributes and full data export',
          price: 7999,
          currency: 'INR',
          billingInterval: 'monthly',
          trialDays: 30,
          maxProducts: -1, // Unlimited
          maxCategories: -1, // Unlimited
          maxAdmins: -1, // Unlimited
          allowCustomProductFields: true,
          allowAnalytics: true,
          allowExportInvoices: true,
          allowOnlineOrdering: true,
          isActive: true,
          displayOrder: 3,
          features: [
            'Unlimited product catalogue',
            'Unlimited categories',
            'Unlimited Shop Admin accounts',
            'Custom form fields & validations',
            'Full audit logging & CSV exports',
            'Dedicated platform onboarding',
          ],
        },
      ]);
      console.log('[Bootstrap] ✅ Default subscription tiers created.');
    }

    // 5. Ensure Platform Default Product Form Template exists
    let defaultTemplate = await ProductFormTemplate.findOne({ isPlatformDefault: true });
    if (!defaultTemplate) {
      console.log('[Bootstrap] Provisioning Platform Default Product Form Template...');
      const superAdminUser = await User.findOne({ role: 'super_admin' });

      defaultTemplate = await ProductFormTemplate.create({
        name: 'Standard Wholesale Catalogue Template',
        description: 'Universal default product specifications schema for wholesale suppliers',
        isPlatformDefault: true,
        assignedShopIds: [],
        status: 'published',
        createdBy: superAdminUser?._id,
      });

      const initialFields: IFormFieldConfig[] = [
        {
          fieldKey: 'brand_name',
          label: 'Brand / Manufacturer',
          type: 'text',
          placeholder: 'e.g., Tata, Nestlé, ITC',
          required: false,
          visibleOnCard: true,
          visibleOnDetails: true,
          searchable: true,
          filterable: true,
          isPublic: true,
          editableByShopAdmin: true,
          displayOrder: 1,
        },
        {
          fieldKey: 'pack_size',
          label: 'Pack / Case Size',
          type: 'text',
          placeholder: 'e.g., 24 x 500ml, 10kg Bag, Carton of 50',
          required: true,
          visibleOnCard: true,
          visibleOnDetails: true,
          searchable: true,
          filterable: false,
          isPublic: true,
          editableByShopAdmin: true,
          displayOrder: 2,
        },
        {
          fieldKey: 'country_of_origin',
          label: 'Country of Origin',
          type: 'text',
          defaultValue: 'India',
          required: false,
          visibleOnCard: false,
          visibleOnDetails: true,
          searchable: false,
          filterable: true,
          isPublic: true,
          editableByShopAdmin: true,
          displayOrder: 3,
        },
        {
          fieldKey: 'shelf_life',
          label: 'Shelf Life / Expiry Duration',
          type: 'text',
          placeholder: 'e.g., 12 Months from MFG',
          required: false,
          visibleOnCard: false,
          visibleOnDetails: true,
          searchable: false,
          filterable: false,
          isPublic: true,
          editableByShopAdmin: true,
          displayOrder: 4,
        },
        {
          fieldKey: 'storage_condition',
          label: 'Storage Recommendation',
          type: 'select',
          options: [
            { label: 'Ambient / Room Temperature', value: 'ambient' },
            { label: 'Cool & Dry Place', value: 'cool_dry' },
            { label: 'Refrigerated (2°C - 8°C)', value: 'refrigerated' },
            { label: 'Frozen (-18°C or below)', value: 'frozen' },
          ],
          defaultOption: 'ambient',
          required: false,
          visibleOnCard: false,
          visibleOnDetails: true,
          searchable: false,
          filterable: true,
          isPublic: true,
          editableByShopAdmin: true,
          displayOrder: 5,
        },
        {
          fieldKey: 'hsn_code',
          label: 'HSN / Tax Classification Code',
          type: 'text',
          placeholder: 'e.g., 2106, 0902',
          required: false,
          visibleOnCard: false,
          visibleOnDetails: true,
          searchable: false,
          filterable: false,
          isPublic: true,
          editableByShopAdmin: true,
          displayOrder: 6,
        },
        {
          fieldKey: 'internal_batch_prefix',
          label: 'Internal Warehouse Bin / Batch Ref',
          type: 'text',
          placeholder: 'e.g., BAY-4-ROW-12',
          required: false,
          visibleOnCard: false,
          visibleOnDetails: false,
          searchable: false,
          filterable: false,
          isPublic: false, // Internal private: NEVER exposed on public API
          editableByShopAdmin: true,
          displayOrder: 7,
        },
      ];

      const initialVersion = await ProductFormVersion.create({
        templateId: defaultTemplate._id,
        versionNumber: 1,
        status: 'published',
        fields: initialFields,
        publishedAt: new Date(),
        createdBy: superAdminUser?._id,
        changeSummary: 'Initial platform default catalogue fields version',
      });

      defaultTemplate.currentPublishedVersionId = initialVersion._id;
      defaultTemplate.latestDraftVersionId = initialVersion._id;
      await defaultTemplate.save();

      console.log('[Bootstrap] ✅ Default Product Form Template published.');
    }

    console.log('============================================================');
    console.log('✅ Super Admin and Platform Foundation Bootstrap Complete!');
    console.log(`📧 Super Admin Email: ${superAdminEmail}`);
    console.log('🔒 Security Note: Password is never printed to logs or stdout.');
    console.log('🔄 First-login password change is strictly enforced.');
    console.log('============================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Bootstrap] ❌ Unhandled error during bootstrap:', error);
    process.exit(1);
  }
}

bootstrapAdmin();
