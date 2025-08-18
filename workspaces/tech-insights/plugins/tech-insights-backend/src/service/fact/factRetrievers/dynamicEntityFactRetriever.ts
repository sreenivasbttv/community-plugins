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
 * Dynamic entity fact retriever that exposes the complete entity structure
 * for flexible property checking with JSONPath expressions.
 *
 * This retriever enables configuration-driven fact checking without requiring
 * code changes for new property validations. It provides:
 *
 * - Complete entity object access via JSONPath
 * - Flattened shortcuts for common properties
 * - Support for nested property validation
 * - Zero-code compliance rule additions
 *
 * @public
 */
export const dynamicEntityFactRetriever: FactRetriever = {
  id: 'dynamicEntityFactRetriever',
  version: '0.1.0',
  title: 'Dynamic Entity Properties',
  description:
    'Exposes complete entity structure for dynamic property checking via JSONPath expressions',

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
      type: 'array',
      description: 'Entity tags array from metadata.tags',
    },

    // Spec object and common shortcuts
    spec: {
      type: 'object',
      description: 'Entity spec object containing type, lifecycle, owner, etc.',
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
      type: 'array',
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
      type: 'number',
      description: 'Total number of relations',
    },
    dependencyCount: {
      type: 'number',
      description: 'Number of dependsOn relations',
    },
    dependentCount: {
      type: 'number',
      description: 'Number of dependencyOf relations',
    },

    // Link information
    links: {
      type: 'array',
      description: 'Entity links array from metadata.links',
    },
    linkCount: {
      type: 'number',
      description: 'Number of links defined',
    },
  },

  handler: async ({
    discovery,
    entityFilter,
    auth,
    config,
  }: FactRetrieverContext) => {
    const { token } = await auth.getPluginRequestToken({
      onBehalfOf: await auth.getOwnServiceCredentials(),
      targetPluginId: 'catalog',
    });

    const catalogClient = new CatalogClient({
      discoveryApi: discovery,
    });

    const entities = await catalogClient.getEntities(
      { filter: entityFilter },
      { token },
    );

    return entities.items.map((entity: Entity) => {
      // Extract commonly used properties for easier access
      const metadata = entity.metadata || {};
      const spec = entity.spec || {};
      const relations = entity.relations || [];
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
