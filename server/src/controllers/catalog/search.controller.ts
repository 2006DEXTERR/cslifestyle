import type { Request, Response } from 'express';
import { ok } from '../../lib/http';
import { parseQuery } from '../../lib/validate-query';
import { searchQuerySchema } from '../../validation/catalog.schemas';
import { getContext } from '../../lib/request-context';
import { searchCatalog } from '../../services/catalog/search.service';

export async function search(req: Request, res: Response): Promise<void> {
  const query = parseQuery(searchQuerySchema, req.query);
  const { ipHash } = getContext(req);
  const result = await searchCatalog(query, ipHash);
  res.json(
    ok(result, {
      pagination: undefined,
      counts: {
        products: result.products.length,
        categories: result.categories.length,
        brands: result.brands.length,
        total: result.total,
      },
    }),
  );
}
