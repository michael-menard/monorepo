import { Request, Response } from 'express'
import { eq, and, asc, desc } from 'drizzle-orm'
import { db } from '../db/client'
import { mocPartsLists, mocInstructions } from '../db/schema'
import { apiResponse, apiErrorResponse } from '../utils/response'
import { CreateMocPartsListSchema, UpdateMocPartsListSchema } from '../types'

// GET /api/moc-instructions/:mocId/parts-lists - Get all parts lists for a MOC
export const getMocPartsLists = async (req: Request, res: Response) => {
  try {
    const userId = req.authenticatedUserId
    const { mocId } = req.params

    if (!userId) {
      return res.status(403).json(apiErrorResponse(403, 'UNAUTHORIZED', 'User not authenticated'))
    }

    // Verify MOC belongs to user
    const moc = await db
      .select()
      .from(mocInstructions)
      .where(and(eq(mocInstructions.id, mocId), eq(mocInstructions.userId, userId)))
      .limit(1)

    if (moc.length === 0) {
      return res
        .status(404)
        .json(apiErrorResponse(404, 'NOT_FOUND', 'MOC instruction not found or not authorized'))
    }

    const partsLists = await db
      .select()
      .from(mocPartsLists)
      .where(eq(mocPartsLists.mocId, mocId))
      .orderBy(asc(mocPartsLists.createdAt))

    return res.status(200).json(apiResponse(200, 'Parts lists retrieved successfully', partsLists))
  } catch (error) {
    console.error('Error getting MOC parts lists:', error)
    return res
      .status(500)
      .json(apiErrorResponse(500, 'INTERNAL_ERROR', 'Failed to retrieve parts lists'))
  }
}

// POST /api/moc-instructions/:mocId/parts-lists - Create new parts list
export const createMocPartsList = async (req: Request, res: Response) => {
  try {
    const userId = req.authenticatedUserId
    const { mocId } = req.params

    if (!userId) {
      return res.status(403).json(apiErrorResponse(403, 'UNAUTHORIZED', 'User not authenticated'))
    }

    // Validate request body
    const validation = CreateMocPartsListSchema.safeParse({ ...req.body, mocId })
    if (!validation.success) {
      return res
        .status(400)
        .json(
          apiErrorResponse(400, 'VALIDATION_ERROR', 'Invalid input data', validation.error.issues),
        )
    }

    // Verify MOC belongs to user
    const moc = await db
      .select()
      .from(mocInstructions)
      .where(and(eq(mocInstructions.id, mocId), eq(mocInstructions.userId, userId)))
      .limit(1)

    if (moc.length === 0) {
      return res
        .status(404)
        .json(apiErrorResponse(404, 'NOT_FOUND', 'MOC instruction not found or not authorized'))
    }

    const { title, description, fileId, totalPartsCount, costEstimate, notes } = validation.data

    const [newPartsList] = await db
      .insert(mocPartsLists)
      .values({
        mocId,
        fileId,
        title,
        description,
        totalPartsCount,
        costEstimate,
        notes,
      })
      .returning()

    return res.status(201).json(apiResponse(201, 'Parts list created successfully', newPartsList))
  } catch (error) {
    console.error('Error creating MOC parts list:', error)
    return res
      .status(500)
      .json(apiErrorResponse(500, 'INTERNAL_ERROR', 'Failed to create parts list'))
  }
}

// PUT /api/moc-instructions/:mocId/parts-lists/:partsListId - Update parts list
export const updateMocPartsList = async (req: Request, res: Response) => {
  try {
    const userId = req.authenticatedUserId
    const { mocId, partsListId } = req.params

    if (!userId) {
      return res.status(403).json(apiErrorResponse(403, 'UNAUTHORIZED', 'User not authenticated'))
    }

    // Validate request body
    const validation = UpdateMocPartsListSchema.safeParse(req.body)
    if (!validation.success) {
      return res
        .status(400)
        .json(
          apiErrorResponse(400, 'VALIDATION_ERROR', 'Invalid input data', validation.error.issues),
        )
    }

    // Verify MOC belongs to user and parts list exists
    const partsList = await db
      .select({
        partsListId: mocPartsLists.id,
        mocUserId: mocInstructions.userId,
      })
      .from(mocPartsLists)
      .innerJoin(mocInstructions, eq(mocPartsLists.mocId, mocInstructions.id))
      .where(
        and(
          eq(mocPartsLists.id, partsListId),
          eq(mocPartsLists.mocId, mocId),
          eq(mocInstructions.userId, userId),
        ),
      )
      .limit(1)

    if (partsList.length === 0) {
      return res
        .status(404)
        .json(apiErrorResponse(404, 'NOT_FOUND', 'Parts list not found or not authorized'))
    }

    // Only update fields that were provided
    const updateData: any = { updatedAt: new Date() }
    const validatedData = validation.data

    Object.keys(validatedData).forEach(key => {
      if (validatedData[key as keyof typeof validatedData] !== undefined) {
        updateData[key] = validatedData[key as keyof typeof validatedData]
      }
    })

    const [updatedPartsList] = await db
      .update(mocPartsLists)
      .set(updateData)
      .where(eq(mocPartsLists.id, partsListId))
      .returning()

    return res
      .status(200)
      .json(apiResponse(200, 'Parts list updated successfully', updatedPartsList))
  } catch (error) {
    console.error('Error updating MOC parts list:', error)
    return res
      .status(500)
      .json(apiErrorResponse(500, 'INTERNAL_ERROR', 'Failed to update parts list'))
  }
}

// PATCH /api/moc-instructions/:mocId/parts-lists/:partsListId/status - Update build/purchase status
export const updatePartsListStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.authenticatedUserId
    const { mocId, partsListId } = req.params
    const { built, purchased, inventoryPercentage, acquiredPartsCount, actualCost, notes } =
      req.body

    if (!userId) {
      return res.status(403).json(apiErrorResponse(403, 'UNAUTHORIZED', 'User not authenticated'))
    }

    // Verify MOC belongs to user and parts list exists
    const partsList = await db
      .select({
        partsListId: mocPartsLists.id,
        mocUserId: mocInstructions.userId,
      })
      .from(mocPartsLists)
      .innerJoin(mocInstructions, eq(mocPartsLists.mocId, mocInstructions.id))
      .where(
        and(
          eq(mocPartsLists.id, partsListId),
          eq(mocPartsLists.mocId, mocId),
          eq(mocInstructions.userId, userId),
        ),
      )
      .limit(1)

    if (partsList.length === 0) {
      return res
        .status(404)
        .json(apiErrorResponse(404, 'NOT_FOUND', 'Parts list not found or not authorized'))
    }

    // Build update object with only provided fields
    const updateData: any = { updatedAt: new Date() }
    if (built !== undefined) updateData.built = built
    if (purchased !== undefined) updateData.purchased = purchased
    if (inventoryPercentage !== undefined) updateData.inventoryPercentage = inventoryPercentage
    if (acquiredPartsCount !== undefined) updateData.acquiredPartsCount = acquiredPartsCount
    if (actualCost !== undefined) updateData.actualCost = actualCost
    if (notes !== undefined) updateData.notes = notes

    const [updatedPartsList] = await db
      .update(mocPartsLists)
      .set(updateData)
      .where(eq(mocPartsLists.id, partsListId))
      .returning()

    return res
      .status(200)
      .json(apiResponse(200, 'Parts list status updated successfully', updatedPartsList))
  } catch (error) {
    console.error('Error updating parts list status:', error)
    return res
      .status(500)
      .json(apiErrorResponse(500, 'INTERNAL_ERROR', 'Failed to update parts list status'))
  }
}

// DELETE /api/moc-instructions/:mocId/parts-lists/:partsListId - Delete parts list
export const deleteMocPartsList = async (req: Request, res: Response) => {
  try {
    const userId = req.authenticatedUserId
    const { mocId, partsListId } = req.params

    if (!userId) {
      return res.status(403).json(apiErrorResponse(403, 'UNAUTHORIZED', 'User not authenticated'))
    }

    // Verify MOC belongs to user and parts list exists
    const partsList = await db
      .select({
        partsListId: mocPartsLists.id,
        mocUserId: mocInstructions.userId,
      })
      .from(mocPartsLists)
      .innerJoin(mocInstructions, eq(mocPartsLists.mocId, mocInstructions.id))
      .where(
        and(
          eq(mocPartsLists.id, partsListId),
          eq(mocPartsLists.mocId, mocId),
          eq(mocInstructions.userId, userId),
        ),
      )
      .limit(1)

    if (partsList.length === 0) {
      return res
        .status(404)
        .json(apiErrorResponse(404, 'NOT_FOUND', 'Parts list not found or not authorized'))
    }

    await db.delete(mocPartsLists).where(eq(mocPartsLists.id, partsListId))

    return res.status(200).json(apiResponse(200, 'Parts list deleted successfully', null))
  } catch (error) {
    console.error('Error deleting MOC parts list:', error)
    return res
      .status(500)
      .json(apiErrorResponse(500, 'INTERNAL_ERROR', 'Failed to delete parts list'))
  }
}

// GET /api/user/parts-lists/summary - Get user's parts list summary
export const getUserPartsListSummary = async (req: Request, res: Response) => {
  try {
    const userId = req.authenticatedUserId

    if (!userId) {
      return res.status(403).json(apiErrorResponse(403, 'UNAUTHORIZED', 'User not authenticated'))
    }

    // Get summary of user's parts lists across all MOCs
    const summary = await db
      .select({
        totalPartsLists: mocPartsLists.id,
        built: mocPartsLists.built,
        purchased: mocPartsLists.purchased,
        mocTitle: mocInstructions.title,
        partsListTitle: mocPartsLists.title,
        inventoryPercentage: mocPartsLists.inventoryPercentage,
      })
      .from(mocPartsLists)
      .innerJoin(mocInstructions, eq(mocPartsLists.mocId, mocInstructions.id))
      .where(eq(mocInstructions.userId, userId))
      .orderBy(desc(mocPartsLists.updatedAt))

    // Calculate summary statistics
    const stats = {
      totalPartsLists: summary.length,
      builtCount: summary.filter(item => item.built).length,
      purchasedCount: summary.filter(item => item.purchased).length,
      averageInventoryPercentage:
        summary.length > 0
          ? (
              summary.reduce((sum, item) => sum + parseFloat(item.inventoryPercentage || '0'), 0) /
              summary.length
            ).toFixed(2)
          : '0.00',
    }

    return res.status(200).json(
      apiResponse(200, 'Parts list summary retrieved successfully', {
        statistics: stats,
        recentPartsLists: summary.slice(0, 10), // Return 10 most recent
      }),
    )
  } catch (error) {
    console.error('Error getting user parts list summary:', error)
    return res
      .status(500)
      .json(apiErrorResponse(500, 'INTERNAL_ERROR', 'Failed to retrieve parts list summary'))
  }
}
