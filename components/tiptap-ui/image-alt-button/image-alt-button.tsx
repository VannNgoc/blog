"use client"

import { useCallback, useEffect, useState } from "react"
import type { Editor } from "@tiptap/react"

// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/tiptap-ui-primitive/popover"
import { Card, CardBody, CardItemGroup } from "@/components/tiptap-ui-primitive/card"
import { Input } from "@/components/tiptap-ui-primitive/input"
import { ButtonGroup } from "@/components/tiptap-ui-primitive/button-group"

export interface ImageAltButtonProps {
  editor: Editor | null
}

/**
 * Toolbar button that edits the alt text of the currently selected image.
 * Uploaded images default their alt text to the raw filename (see
 * image-upload-node.tsx), which reads as noise to screen readers — this is
 * the only place in the editor that lets an author replace it with a real
 * description.
 */
export const ImageAltButton: React.FC<ImageAltButtonProps> = ({ editor }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [alt, setAlt] = useState("")

  // Re-render on every selection/content change so `isImageSelected` and the
  // synced alt text below stay accurate as the author clicks between nodes.
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    if (!editor) return
    const rerender = () => forceUpdate((n) => n + 1)
    editor.on("selectionUpdate", rerender)
    editor.on("transaction", rerender)
    return () => {
      editor.off("selectionUpdate", rerender)
      editor.off("transaction", rerender)
    }
  }, [editor])

  const isImageSelected = !!editor?.isActive("image")

  // Keep the input in sync with whichever image is currently selected,
  // rather than only reading it once when the popover opens.
  useEffect(() => {
    if (!editor) return
    setAlt(isImageSelected ? (editor.getAttributes("image").alt ?? "") : "")
  }, [editor, isImageSelected])

  const applyAlt = useCallback(() => {
    if (!editor) return
    editor.chain().focus().updateAttributes("image", { alt }).run()
    setIsOpen(false)
  }, [editor, alt])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      applyAlt()
    }
  }

  if (!editor?.isEditable) return null

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          disabled={!isImageSelected}
          aria-label="Edit image alt text"
          tooltip="Edit alt text"
          onClick={() => setIsOpen((open) => !open)}
        >
          Alt
        </Button>
      </PopoverTrigger>

      <PopoverContent collisionPadding={4}>
        <Card>
          <CardBody>
            <CardItemGroup orientation="horizontal">
              <label htmlFor="image-alt-input" className="sr-only">
                Image alt text
              </label>
              <Input
                id="image-alt-input"
                type="text"
                placeholder="Describe this image..."
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                autoComplete="off"
              />
              <ButtonGroup>
                <Button type="button" variant="primary" onClick={applyAlt}>
                  Save
                </Button>
              </ButtonGroup>
            </CardItemGroup>
          </CardBody>
        </Card>
      </PopoverContent>
    </Popover>
  )
}

ImageAltButton.displayName = "ImageAltButton"

export default ImageAltButton
