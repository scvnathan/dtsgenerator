import * as ts from 'typescript';
import { NormalizedSchema } from './jsonSchema';

export function buildAnyKeyword(): ts.KeywordTypeNode {
    return ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
}
export function buildStringKeyword(): ts.KeywordTypeNode {
    return ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
}
export function buildSimpleArrayNode(element: ts.TypeNode): ts.ArrayTypeNode {
    return ts.createArrayTypeNode(element);
}

export function buildNamespaceNode(name: string, statements: ts.Statement[], root: boolean): ts.ModuleDeclaration {
    const modifiers = root ? [ts.createModifier(ts.SyntaxKind.DeclareKeyword)] : undefined;
    return ts.createModuleDeclaration(
        undefined,
        modifiers,
        ts.createIdentifier(name),
        ts.createModuleBlock(statements),
        ts.NodeFlags.Namespace | ts.NodeFlags.ExportContext | ts.NodeFlags.ContextFlags);
}

export function buildInterfaceNode(name: string, members: ts.TypeElement[], root: boolean): ts.InterfaceDeclaration {
    const modifiers = root ?
        [ts.createModifier(ts.SyntaxKind.DeclareKeyword)] :
        [ts.createModifier(ts.SyntaxKind.ExportKeyword)] ;
    return ts.createInterfaceDeclaration(
        undefined,
        modifiers,
        ts.createIdentifier(name),
        undefined,
        undefined,
        members);
}

export function buildTypeAliasNode(name: string, type: ts.TypeNode, root: boolean): ts.TypeAliasDeclaration {
    const modifiers = root ?
        [ts.createModifier(ts.SyntaxKind.DeclareKeyword)] :
        [ts.createModifier(ts.SyntaxKind.ExportKeyword)] ;
    return ts.createTypeAliasDeclaration(
        undefined,
        modifiers,
        ts.createIdentifier(name),
        undefined,
        type);
}

export function buildPropertySignature(schema: NormalizedSchema, propertyName: string, valueType: ts.TypeNode, required: string[] | undefined): ts.PropertySignature {
    const content = schema.content;
    const modifiers = 'readOnly' in content && content.readOnly ? [ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)] : undefined;
    const questionToken = required == null || required.indexOf(propertyName) < 0 ? ts.createToken(ts.SyntaxKind.QuestionToken) : undefined;
    return ts.createPropertySignature(
        modifiers,
        ts.createIdentifier(propertyName),
        questionToken,
        valueType,
        undefined);
}

export function buildIndexSignatureNode(name: string, indexType: ts.TypeNode, valueType: ts.TypeNode): ts.IndexSignatureDeclaration {
    return ts.createIndexSignature(
        undefined,
        undefined,
        [ts.createParameter(
            undefined,
            undefined,
            undefined,
            ts.createIdentifier(name),
            undefined,
            indexType,
            undefined
        )],
        valueType);
}

export function addComment<T extends ts.Node>(node: T, schema: NormalizedSchema): T {
    const comment = buildComment(schema);
    if (comment == null) {
        return node;
    }
    return ts.addSyntheticLeadingComment(node, ts.SyntaxKind.MultiLineCommentTrivia, comment, true);
}

export function buildComment(schema: NormalizedSchema): string | undefined {
    const content = schema.content;
    let comments: string[] = [];
    function protectComment(str: string): string {
        return str.replace(/\*\//g, '*\u200B/'); // Unicode [ZERO WIDTH SPACE]
    }
    function addComment(value: any): void {
        if (value == null) {
            return;
        }
        const s = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
        const lines = s.split('\n').map((line: string) => protectComment(line));
        comments = comments.concat(...lines);
    }

    if ('$comment' in content) {
        addComment(content.$comment);
    }
    addComment(content.title);
    addComment(content.description);
    if ('example' in content || 'examples' in content) {
        addComment('example:');
        if ('example' in content) {
            addComment(content.example);
        }
        if ('examples' in content) {
            if (content.examples) {
                for (const e of content.examples) {
                    addComment(e);
                }
            }
        }
    }

    if (comments.length == 0) {
        return undefined;
    }
    let result = '*\n';
    for (const comment of comments) {
        result += comment + '\n';
    }
    result += ' ';
    return result;
}

export function addOptionalInformation<T extends ts.Node>(node: T, schema: NormalizedSchema, terminate: boolean): T {
    const format = schema.content.format;
    const pattern = schema.content.pattern;
    if (!format && !pattern) {
        return node;
    }

    let comment = '';
    if (format) {
        comment += ' ' + format;
    }
    if (pattern) {
        comment += ' ' + pattern;
    }

    const kind = terminate ? ts.SyntaxKind.SingleLineCommentTrivia : ts.SyntaxKind.MultiLineCommentTrivia;
    return ts.addSyntheticTrailingComment(node, kind, comment, false);
}
