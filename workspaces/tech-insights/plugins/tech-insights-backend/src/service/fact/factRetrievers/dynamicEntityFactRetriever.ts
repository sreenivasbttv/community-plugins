/*
 * Copyright 2024 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  FactRetriever,
  FactRetrieverContext,
} from '@backstage-community/plugin-tech-insights-node';
import { CatalogClient } from '@backstage/catalog-client';
import { Entity } from '@backstage/catalog-model';
import { DateTime } from 'luxon';

/**
 * Create a dynamic entity fact retriever with a specific entity filter
 *
 * @param entityFilterConfig - Entity filter to apply
 * @param factRetrieverId - ID of the fact retriever
 * @public
 */
export function createDynamicEntityFactRetriever(
  entityFilterConfig?: any,
  factRetrieverId: string = 'dynamicEntityFactRetriever',
): FactRetriever {
  return {
    id: factRetrieverId,
    version: '0.1.0',
    title: `Dynamic Entity Properties${
      entityFilterConfig ? ' (Filtered)' : ''
    }`,
    description: `Dynamic entity fact retriever${
      entityFilterConfig ? ' with entity filtering' : ''
    }`,

    schema: {
      // Complete entity object for full JSONPath access
      entity: {
        type: 'object',
        description:
          'Complete entity object with all properties accessible via JSONPath',
      },

      // Core entity identification - flattened for easier access
      kind: {
        type: 'string',
        description: 'Entity kind (e.g., Component, API, Resource)',
      },
      name: {
        type: 'string',
        description: 'Entity name from metadata.name',
      },
      namespace: {
        type: 'string',
        description: 'Entity namespace from metadata.namespace',
      },

      // Metadata object and common shortcuts
      metadata: {
        type: 'object',
        description:
          'Entity metadata object containing title, description, annotations, labels, etc.',
      },
      annotations: {
        type: 'object',
        description: 'Entity annotations object (metadata.annotations)',
      },
      labels: {
        type: 'object',
        description: 'Entity labels object (metadata.labels)',
      },
      title: {
        type: 'string',
        description: 'Entity title from metadata.title',
      },
      description: {
        type: 'string',
        description: 'Entity description from metadata.description',
      },
      tags: {
        type: 'object',
        description: 'Entity tags array from metadata.tags',
      },

      // Spec object and common shortcuts
      spec: {
        type: 'object',
        description:
          'Entity spec object containing type, lifecycle, owner, etc.',
      },
      owner: {
        type: 'string',
        description: 'Entity owner from spec.owner',
      },
      lifecycle: {
        type: 'string',
        description: 'Entity lifecycle from spec.lifecycle',
      },
      type: {
        type: 'string',
        description: 'Entity type from spec.type',
      },
      system: {
        type: 'string',
        description: 'Entity system from spec.system',
      },

      // Relations for dependency analysis
      relations: {
        type: 'object',
        description:
          'Entity relations array for dependency and ownership analysis',
      },

      // Status object
      status: {
        type: 'object',
        description: 'Entity status object',
      },

      // Computed properties for common checks
      hasTitle: {
        type: 'boolean',
        description: 'Boolean indicating if entity has a title',
      },
      hasDescription: {
        type: 'boolean',
        description: 'Boolean indicating if entity has a description',
      },
      hasTags: {
        type: 'boolean',
        description: 'Boolean indicating if entity has tags',
      },
      hasOwner: {
        type: 'boolean',
        description: 'Boolean indicating if entity has an owner',
      },
      hasAnnotations: {
        type: 'boolean',
        description: 'Boolean indicating if entity has annotations',
      },
      hasLabels: {
        type: 'boolean',
        description: 'Boolean indicating if entity has labels',
      },

      // Relationship counts for dependency analysis
      relationCount: {
        type: 'integer',
        description: 'Total number of relations',
      },
      dependencyCount: {
        type: 'integer',
        description: 'Number of dependsOn relations',
      },
      dependentCount: {
        type: 'integer',
        description: 'Number of dependencyOf relations',
      },

      // Link information
      links: {
        type: 'object',
        description: 'Entity links array from metadata.links',
      },
      linkCount: {
        type: 'integer',
        description: 'Number of links defined',
      },
    },

    handler: async ({
      discovery,
      entityFilter,
      auth,
      logger,
    }: FactRetrieverContext) => {
      const { token } = await auth.getPluginRequestToken({
        onBehalfOf: await auth.getOwnServiceCredentials(),
        targetPluginId: 'catalog',
      });

      const catalogClient = new CatalogClient({
        discoveryApi: discovery,
      });

      // Use entityFilterConfig from configuration if available, otherwise fall back to context entityFilter
      const finalEntityFilter = entityFilterConfig || entityFilter;

      if (entityFilterConfig) {
        logger?.info(
          `${factRetrieverId} using configured entity filter:`,
          finalEntityFilter,
        );
      } else {
        logger?.info(
          `${factRetrieverId} using context entity filter:`,
          finalEntityFilter,
        );
      }

      const entities = await catalogClient.getEntities(
        { filter: finalEntityFilter },
        { token },
      );

      logger?.info(
        `${factRetrieverId} processed ${entities.items.length} entities`,
      );

      return entities.items.map((entity: Entity) => {
        // Extract commonly used properties for easier access
        const metadata = entity.metadata || {};
        const spec = entity.spec || {};
        const relations = entity.relations || [];
        const status = (entity as any).status || {};
        const annotations = metadata.annotations || {};
        const labels = metadata.labels || {};
        const tags = metadata.tags || [];
        const links = metadata.links || [];

        // Calculate relationship counts
        const dependencyCount = relations.filter(
          r => r.type === 'dependsOn',
        ).length;
        const dependentCount = relations.filter(
          r => r.type === 'dependencyOf',
        ).length;

        return {
          entity: {
            namespace: entity.metadata.namespace!,
            kind: entity.kind,
            name: entity.metadata.name,
          },
          facts: {
            // Complete entity for JSONPath access
            entity: entity,

            // Core identification
            kind: entity.kind,
            name: metadata.name,
            namespace: metadata.namespace || 'default',

            // Metadata shortcuts
            metadata: metadata,
            annotations: annotations,
            labels: labels,
            title: metadata.title || null,
            description: metadata.description || null,
            tags: tags,
            links: links,

            // Spec shortcuts
            spec: spec,
            owner: spec.owner || null,
            lifecycle: spec.lifecycle || null,
            type: spec.type || null,
            system: spec.system || null,

            // Relations
            relations: relations,
            status: status,

            // Computed boolean flags for common checks
            hasTitle: Boolean(metadata.title),
            hasDescription: Boolean(metadata.description),
            hasTags: tags.length > 0,
            hasOwner: Boolean(spec.owner),
            hasAnnotations: Object.keys(annotations).length > 0,
            hasLabels: Object.keys(labels).length > 0,

            // Counts for analysis
            relationCount: relations.length,
            dependencyCount: dependencyCount,
            dependentCount: dependentCount,
            linkCount: links.length,
          },
          timestamp: DateTime.now(),
        };
      });
    },
  };
}

/**
 * Default dynamic entity fact retriever (no filtering)
 * @public
 */
export const dynamicEntityFactRetriever = createDynamicEntityFactRetriever();

/**
 * Pre-configured fact retrievers with common entity filters
 * Export these and register them in your backend to get entity filtering per check
 * @public
 */

// Components only
export const dynamicEntityFactRetrieverComponents =
  createDynamicEntityFactRetriever(
    { kind: ['Component'] },
    'dynamicEntityFactRetrieverComponents',
  );

// Production entities only
export const dynamicEntityFactRetrieverProduction =
  createDynamicEntityFactRetriever(
    { 'spec.lifecycle': 'production' },
    'dynamicEntityFactRetrieverProduction',
  );

// API entities only
export const dynamicEntityFactRetrieverAPIs = createDynamicEntityFactRetriever(
  { kind: ['API'] },
  'dynamicEntityFactRetrieverAPIs',
);

// Service components only
export const dynamicEntityFactRetrieverServices =
  createDynamicEntityFactRetriever(
    { kind: ['Component'], 'spec.type': 'service' },
    'dynamicEntityFactRetrieverServices',
  );

/**
 * Helper to create custom filtered fact retrievers
 * @public
 */
export function createFilteredDynamicFactRetriever(
  filter: any,
  id: string,
): FactRetriever {
  return createDynamicEntityFactRetriever(filter, id);
}
