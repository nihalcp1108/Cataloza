import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { ProductFormTemplate } from '../models/ProductFormTemplate';
import { ProductFormVersion, IFormFieldConfig } from '../models/ProductFormVersion';
import { Shop } from '../models/Shop';
import { AuthenticatedRequest } from '../types';
import { ProductFormService } from '../services/productForm.service';
import { AuditService } from '../services/audit.service';

export class ProductFormController {
  /**
   * Super Admin: List all product form templates
   */
  public static async getTemplates(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const templates = await ProductFormTemplate.find()
        .populate('currentPublishedVersionId', 'versionNumber status publishedAt fields')
        .populate('assignedShopIds', 'name slug status')
        .sort({ isPlatformDefault: -1, createdAt: -1 });

      res.json({
        success: true,
        data: { templates },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Super Admin: Get single template by ID with its versions history
   */
  public static async getTemplateById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const template = await ProductFormTemplate.findById(id).populate('assignedShopIds', 'name slug');
      if (!template) {
        res.status(404).json({ success: false, message: 'Form template not found' });
        return;
      }

      const versions = await ProductFormVersion.find({ templateId: id }).sort({ versionNumber: -1 });

      const publishedVersion = template.currentPublishedVersionId
        ? await ProductFormVersion.findById(template.currentPublishedVersionId)
        : null;

      const latestDraft = await ProductFormVersion.findOne({
        templateId: id,
        status: 'draft',
      }).sort({ versionNumber: -1 });

      res.json({
        success: true,
        data: {
          template,
          versions,
          publishedVersion,
          latestDraft,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Super Admin: Create a new product form template
   */
  public static async createTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { name, description, isPlatformDefault, fields } = req.body;

      if (!name) {
        res.status(400).json({ success: false, message: 'Template name is required' });
        return;
      }

      // If set as platform default, unset any previous platform default
      if (isPlatformDefault) {
        await ProductFormTemplate.updateMany({}, { isPlatformDefault: false });
      }

      const template = await ProductFormTemplate.create({
        name,
        description: description || '',
        isPlatformDefault: Boolean(isPlatformDefault),
        status: 'draft',
        createdBy: req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined,
      });

      // Create version 1 (draft)
      const initialFields: IFormFieldConfig[] = Array.isArray(fields) ? fields : [];
      const version = await ProductFormVersion.create({
        templateId: template._id,
        versionNumber: 1,
        status: 'draft',
        fields: initialFields,
        createdBy: req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined,
      });

      template.latestDraftVersionId = version._id;
      await template.save();

      await AuditService.log({
        actorId: req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined,
        actorRole: req.user?.role,
        action: 'CREATE_PRODUCT_FORM_TEMPLATE',
        targetEntity: 'ProductFormTemplate',
        targetId: template._id.toString(),
        metadata: { name, fieldCount: initialFields.length },
      });

      res.status(201).json({
        success: true,
        message: 'Product form template created successfully',
        data: { template, version },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Super Admin: Update template basic metadata
   */
  public static async updateTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description, isPlatformDefault, status } = req.body;

      const template = await ProductFormTemplate.findById(id);
      if (!template) {
        res.status(404).json({ success: false, message: 'Template not found' });
        return;
      }

      if (name) template.name = name;
      if (description !== undefined) template.description = description;
      if (status) template.status = status;

      if (isPlatformDefault && !template.isPlatformDefault) {
        await ProductFormTemplate.updateMany({ _id: { $ne: id } }, { isPlatformDefault: false });
        template.isPlatformDefault = true;
      } else if (isPlatformDefault === false && template.isPlatformDefault) {
        template.isPlatformDefault = false;
      }

      await template.save();

      res.json({
        success: true,
        message: 'Template updated successfully',
        data: { template },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Super Admin: Save draft version with fields
   */
  public static async saveDraft(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { fields, changeSummary } = req.body;

      if (!Array.isArray(fields)) {
        res.status(400).json({ success: false, message: 'Fields must be an array' });
        return;
      }

      const template = await ProductFormTemplate.findById(id);
      if (!template) {
        res.status(404).json({ success: false, message: 'Template not found' });
        return;
      }

      // Check if there is an existing draft
      let draft = await ProductFormVersion.findOne({
        templateId: id,
        status: 'draft',
      }).sort({ versionNumber: -1 });

      if (draft) {
        draft.fields = fields;
        draft.changeSummary = changeSummary || draft.changeSummary;
        await draft.save();
      } else {
        // Find latest version number
        const latest = await ProductFormVersion.findOne({ templateId: id }).sort({ versionNumber: -1 });
        const nextVersionNumber = latest ? latest.versionNumber + 1 : 1;

        draft = await ProductFormVersion.create({
          templateId: id,
          versionNumber: nextVersionNumber,
          status: 'draft',
          fields,
          changeSummary: changeSummary || 'Draft update',
          createdBy: req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined,
        });

        template.latestDraftVersionId = draft._id;
        await template.save();
      }

      res.json({
        success: true,
        message: 'Form fields draft saved successfully',
        data: { draft },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Super Admin: Publish draft version to make it live for shops
   */
  public static async publishVersion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { fields, changeSummary } = req.body;

      const template = await ProductFormTemplate.findById(id);
      if (!template) {
        res.status(404).json({ success: false, message: 'Template not found' });
        return;
      }

      // Validate fields if provided in publish payload
      let draft = await ProductFormVersion.findOne({
        templateId: id,
        status: 'draft',
      }).sort({ versionNumber: -1 });

      const fieldsToPublish = Array.isArray(fields) ? fields : draft?.fields || [];

      // Validate that all fieldKeys are unique and non-empty
      const fieldKeys = new Set<string>();
      for (const f of fieldsToPublish) {
        if (!f.fieldKey || !f.fieldKey.trim()) {
          res.status(400).json({ success: false, message: `All fields must have a valid field key.` });
          return;
        }
        if (fieldKeys.has(f.fieldKey)) {
          res.status(400).json({
            success: false,
            message: `Duplicate field key detected: '${f.fieldKey}'. Field keys must be unique within a template.`,
          });
          return;
        }
        fieldKeys.add(f.fieldKey);
      }

      // Compute version number
      const latestPublished = await ProductFormVersion.findOne({
        templateId: id,
        status: 'published',
      }).sort({ versionNumber: -1 });

      const nextVersionNumber = latestPublished ? latestPublished.versionNumber + 1 : 1;

      // Create new published version
      const publishedVersion = await ProductFormVersion.create({
        templateId: id,
        versionNumber: nextVersionNumber,
        status: 'published',
        fields: fieldsToPublish,
        publishedAt: new Date(),
        changeSummary: changeSummary || `Published version ${nextVersionNumber}`,
        createdBy: req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined,
      });

      // If there was a draft, delete or mark it published
      if (draft) {
        await ProductFormVersion.findByIdAndDelete(draft._id);
      }

      template.status = 'published';
      template.currentPublishedVersionId = publishedVersion._id;
      template.latestDraftVersionId = undefined;
      await template.save();

      await AuditService.log({
        actorId: req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined,
        actorRole: req.user?.role,
        action: 'PUBLISH_PRODUCT_FORM_VERSION',
        targetEntity: 'ProductFormTemplate',
        targetId: id,
        metadata: { versionNumber: nextVersionNumber, fieldCount: fieldsToPublish.length },
      });

      res.json({
        success: true,
        message: `Version ${nextVersionNumber} published successfully and is now live!`,
        data: { template, publishedVersion },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Super Admin: Duplicate a template
   */
  public static async duplicateTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const original = await ProductFormTemplate.findById(id);
      if (!original) {
        res.status(404).json({ success: false, message: 'Source template not found' });
        return;
      }

      const latestVersion = original.currentPublishedVersionId
        ? await ProductFormVersion.findById(original.currentPublishedVersionId)
        : await ProductFormVersion.findOne({ templateId: id }).sort({ versionNumber: -1 });

      const newTemplate = await ProductFormTemplate.create({
        name: `${original.name} (Copy)`,
        description: original.description,
        isPlatformDefault: false,
        assignedShopIds: [],
        status: 'draft',
        createdBy: req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined,
      });

      if (latestVersion) {
        const clonedVersion = await ProductFormVersion.create({
          templateId: newTemplate._id,
          versionNumber: 1,
          status: 'draft',
          fields: latestVersion.fields,
          changeSummary: `Cloned from ${original.name}`,
          createdBy: req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined,
        });

        newTemplate.latestDraftVersionId = clonedVersion._id;
        await newTemplate.save();
      }

      res.status(201).json({
        success: true,
        message: 'Template duplicated successfully',
        data: { template: newTemplate },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Super Admin: Assign template to one or more shops
   */
  public static async assignTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { templateId, shopIds } = req.body;

      if (!templateId || !Array.isArray(shopIds)) {
        res.status(400).json({ success: false, message: 'templateId and shopIds array are required' });
        return;
      }

      const template = await ProductFormTemplate.findById(templateId);
      if (!template) {
        res.status(404).json({ success: false, message: 'Template not found' });
        return;
      }

      // Update shop records
      await Shop.updateMany(
        { _id: { $in: shopIds.map((s: string) => new Types.ObjectId(s)) } },
        { productFormTemplateId: new Types.ObjectId(templateId) }
      );

      // Update template assignedShopIds
      const uniqueShopIds = Array.from(
        new Set([...template.assignedShopIds.map((s) => s.toString()), ...shopIds])
      ).map((id) => new Types.ObjectId(id));

      template.assignedShopIds = uniqueShopIds;
      await template.save();

      res.json({
        success: true,
        message: `Template assigned to ${shopIds.length} shop(s) successfully`,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Public & Shop Admin: Get effective published product form for a given shop
   */
  public static async getEffectiveForm(req: Request, res: Response): Promise<void> {
    try {
      const { shopId } = req.params;
      const isPublic = !((req as any).user && ['super_admin', 'shop_admin'].includes((req as any).user.role));

      const { template, version, fields } = await ProductFormService.getEffectiveFormForShop(
        shopId,
        isPublic
      );

      res.json({
        success: true,
        data: {
          template,
          versionNumber: version?.versionNumber || 1,
          versionId: version?._id,
          fields,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
