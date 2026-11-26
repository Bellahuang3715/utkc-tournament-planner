from pydantic.json_schema import GenerateJsonSchema
from pydantic_core import core_schema


def field_is_required(
    self: GenerateJsonSchema,
    field: core_schema.ModelField | core_schema.DataclassField | core_schema.TypedDictField,
    total: bool,
) -> bool:
    """
    Mark all fields as required in the OpenAPI schema.

    Otherwise Pydantic marks fields as optional and nullable at once, which makes
    hey-api generate awkward types like `field?: string | null`.
    """
    return True


GenerateJsonSchema.field_is_required = field_is_required  # type: ignore[method-assign]
