import { Label } from "@radix-ui/react-label";
import { Separator } from "@radix-ui/react-separator";
import { FileVideo, Upload } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

export function VideoInputForm () {
    const [ videoFile, setVideoFile ] = useState<File | null>(null);
    const promptInputRef = useRef<HTMLTextAreaElement>(null) // acessar o valor da textarea

    function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
        const { files } = event.currentTarget;

        if(!files) {
            return // não faz nada
        }

        const selectedFile = files[0];

        setVideoFile(selectedFile)
    }

    async function convertVideoToAudio(video: File) {
        console.log("Convert started.")

        const ffmpeg = await getFFmpeg();

        await ffmpeg.writeFile("input.mp4", await fetchFile(video));

        // Deixar comentado e só descomentar caso esteja dando algum erro
        // ffmpeg.on("log", log => {
        //     console.log(log);
        // })

        ffmpeg.on("progress", progress => {
            console.log("Convert progress: " + Math.round(progress.progress * 100))
        })

        await ffmpeg.exec([
            '-i',
            'input.mp4',
            '-map',
            '0:a',
            '-b:a',
            '20k',
            '-acodec',
            'libmp3lame',
            'output.mp3'
          ])

        // processo de conversão do ffmpeg para js
        const data = await ffmpeg.readFile('output.mp3')

        const audioFileBlob = new Blob([data], { type: 'audio/mp3' })
        const audioFile = new File([audioFileBlob], 'output.mp3', {
        type: 'audio/mpeg'
        })

        console.log('Convert finished.')

        return audioFile
    }

    async function handleUploadVideo(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const prompt = promptInputRef.current?.value // efetivamente pega o value da textarea acessando seus atributos com useRef
        
        if(!videoFile) { // verifica se foi selecionado algum vídeo
            return
        }

        // converter vídeo em áudio
        const audioFile = await convertVideoToAudio(videoFile)

        console.log(audioFile)
    }

    const previewURL = useMemo(() => {
        if(!videoFile) {
            return null
        }

        return URL.createObjectURL(videoFile);
    }, [videoFile])

    return (
    <form onSubmit={handleUploadVideo} className="space-y-6">
            <label 
              htmlFor="video" 
              className="relative border flex rounded-md aspect-video cursor-pointer border-dashed text-sm 
                flex-col gap-2 items-center justify-center text-muted-foreground hover:bg-primary/5">
              {previewURL ? 
              (<video src={previewURL} controls={false} className="pointer-events-none absolute inset-0" />)
               : (
                <>
                    <FileVideo className="w-4 h-4"/>
                    Selecione um vídeo
                </>
              )}
            </label>

            <input 
                type="file" 
                id="video" 
                accept="video/mp4" 
                className="sr-only" 
                onChange={handleFileSelected}
            /> 
            {/*fica disponivel apenas para leitores de tela*/}

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="transcription_prompt">Pompt de transcrição</Label>
              <Textarea 
                ref={promptInputRef}
                id="transcription_prompt" 
                className="h-20 leading-relax resize-none"
                placeholder="Inclua palavras-chave anunciadas no vídeo separadas por vírgula (,)"
                />
            </div>

            <Button type="submit" className="w-full">
              Carregar vídeo
              <Upload className="w-4 h-4 ml-2"/>
            </Button>
          </form>
    )
}