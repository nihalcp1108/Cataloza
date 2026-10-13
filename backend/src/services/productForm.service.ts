import { Types } from 'mongoose';
import { ProductFormTemplate, IProductFormTemplate } from '../models/ProductFormTemplate';
import { ProductFormVersion, IProductFormVersion, IFormFieldConfig } from '../models/ProductFormVersion';
import { Shop } from '../models/Shop';

export class ProductFormService {
  /**
   * Resolves the effective published product form version for a given shop
   */
  public static async getEffectiveFormForShop(
    shopId?: string | Types.ObjectId,
    isPublicRequest: boolean = false
  ): Promise<{
    template: IProductFormTemplate | null;
    version: IProductFormVersion | null;
    fields: IFormFieldConfig[];
  }> {
    let template: IProductFormTemplate | null = null;
    let version: IProductFormVersion | null = null;

    if (shopId) {
      // 1. Check shop's explicit template assignment
      const shop = await Shop.findById(shopId);
      if (shop?.productFormTemplateId) {
        template = await ProductFormTemplate.findById(shop.productFormTemplateId);
        if (template && template.currentPublishedVersionId) {
          version = await ProductFormVersion.findById(template.currentPublishedVersionId);
        }
      }

      // 2. Check if any template has assignedShopIds containing this shop
      if (!version) {
        template = await ProductFormTemplate.findOne({
          assignedShopIds: new Types.ObjectId(shopId.toString()),
          status: 'published',
        });
        if (template && template.currentPublishedVersionId) {
          version = await ProductFormVersion.findById(template.currentPublishedVersionId);
        }
      }
    }

    // 3. Fallback to Platform Default template
    if (!version) {
      template = await ProductFormTemplate.findOne({
        isPlatformDefault: true,
        status: 'published',
      });
      if (template && template.currentPublishedVersionId) {
        version = await ProductFormVersion.findById(template.currentPublishedVersionId);
      }
    }

    let fields = version ? version.fields : [];

    // If public request (catalogue visitor), filter out private internal fields
    if (isPublicRequest) {
      fields = fields.filter((f) => f.isPublic !== false);
    }

    // Sort by display order
    fields = [...fields].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    return { template, version, fields };
  }

  /**
   * Validates custom fields submitted by Shop Admin against published form configuration
   */
  public static validateCustomFields(
    customFields: Record<string, any> = {},
    fieldsConfig: IFormFieldConfig[]
  ): { isValid: boolean; errors: { field: string; message: string }[] } {
    const errors: { field: string; message: string }[] = [];

    for (const field of fieldsConfig) {
      const value = customFields[field.fieldKey];
      const hasValue = value !== undefined && value !== null && value !== '';

      // Check required
      if (field.required && !hasValue) {
        errors.push({
          field: field.fieldKey,
          message: `${field.label} is required.`,
        });
        continue;
      }

      if (!hasValue) continue;

      // Type validations
      switch (field.type) {
        case 'number':
        case 'decimal':
        case 'price':
        case 'moq':
        case 'stock': {
          const num = Number(value);
          if (isNaN(num)) {
            errors.push({
              field: field.fieldKey,
              message: `${field.label} must be a valid number.`,
            });
          } else {
            if (field.minValue !== undefined && num < field.minValue) {
              errors.push({
                field: field.fieldKey,
                message: `${field.label} must be at least ${field.minValue}.`,
              });
            }
            if (field.maxValue !== undefined && num > field.maxValue) {
              errors.push({
                field: field.fieldKey,
                message: `${field.label} cannot exceed ${field.maxValue}.`,
              });
            }
          }
          break;
        }

        case 'text':
        case 'textarea':
        case 'sku':
        case 'uom': {
          const str = String(value);
          if (field.minLength !== undefined && str.length < field.minLength) {
            errors.push({
              field: field.fieldKey,
              message: `${field.label} must be at least ${field.minLength} characters.`,
            });
          }
          if (field.maxLength !== undefined && str.length > field.maxLength) {
            errors.push({
              field: field.fieldKey,
              message: `${field.label} cannot exceed ${field.maxLength} characters.`,
            });
          }
          if (field.regex) {
            try {
              const rx = new RegExp(field.regex);
              if (!rx.test(str)) {
                errors.push({
                  field: field.fieldKey,
                  message: `${field.label} is not in the expected format.`,
                });
              }
            } catch {
              // Ignore invalid regex in user config
            }
          }
          break;
        }

        case 'select':
        case 'radio': {
          if (field.options && field.options.length > 0) {
            const allowed = field.options.map((o) => o.value);
            if (!allowed.includes(String(value))) {
              errors.push({
                field: field.fieldKey,
                message: `${field.label} must be one of the configured options.`,
              });
            }
          }
          break;
        }

        case 'multiselect': {
          if (Array.isArray(value) && field.options && field.options.length > 0) {
            const allowed = field.options.map((o) => o.value);
            const invalidItems = value.filter((v) => !allowed.includes(String(v)));
            if (invalidItems.length > 0) {
              errors.push({
                field: field.fieldKey,
                message: `Invalid selection in ${field.label}.`,
              });
            }
          }
          break;
        }

        case 'email': {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(String(value))) {
            errors.push({
              field: field.fieldKey,
              message: `${field.label} must be a valid email address.`,
            });
          }
          break;
        }

        case 'url': {
          try {
            new URL(String(value));
          } catch {
            errors.push({
              field: field.fieldKey,
              message: `${field.label} must be a valid URL.`,
            });
          }
          break;
        }

        case 'boolean': {
          if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
            errors.push({
              field: field.fieldKey,
              message: `${field.label} must be true or false.`,
            });
          }
          break;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
