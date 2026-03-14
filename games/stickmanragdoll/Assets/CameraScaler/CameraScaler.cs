using UnityEngine;
using Cinemachine;

namespace EmeraldPowder.CameraScaler
{
    [AddComponentMenu("Rendering/Camera Scaler")]
    [HelpURL("https://emeraldpowder.github.io/unity-assets/camera-scaler/")]
    public class CameraScaler : MonoBehaviour
    {
        [Tooltip("Set this to the resolution you have set in Game View, or resolution you usually test you game with")]
        public Vector2 ReferenceResolution = new Vector2(720, 1280);

        public WorkingMode Mode = WorkingMode.ConstantWidth;
        public float MatchWidthOrHeight = 0.5f;

        private CinemachineVirtualCamera componentCamera;
        private float targetAspect;
        private float cameraZoom = 1;

        private float initialSize;

        private float initialFov;
        private float horizontalFov;

        private float previousUpdateAspect;
        private WorkingMode previousUpdateMode;
        private float previousUpdateMatch;

        public float HorizontalSize => initialSize * targetAspect;
        public float HorizontalFov => horizontalFov;

        public float CameraZoom
        {
            get => cameraZoom;
            set
            {
                cameraZoom = value;
                UpdateCamera();
            }
        }

        public enum WorkingMode
        {
            ConstantHeight,
            ConstantWidth,
            MatchWidthOrHeight,
            Expand,
            Shrink
        }

        private void Awake()
        {
            componentCamera = GetComponent<CinemachineVirtualCamera>();
            initialSize = componentCamera.m_Lens.OrthographicSize;

            targetAspect = ReferenceResolution.x / ReferenceResolution.y;

            initialFov = componentCamera.m_Lens.FieldOfView;
            horizontalFov = CalcVerticalFov(initialFov, 1 / targetAspect);
        }

        private void Update()
        {
            if (!Mathf.Approximately(previousUpdateAspect, componentCamera.m_Lens.Aspect) ||
                previousUpdateMode != Mode ||
                !Mathf.Approximately(previousUpdateMatch, MatchWidthOrHeight))
            {
                UpdateCamera();

                previousUpdateAspect = componentCamera.m_Lens.Aspect;
                previousUpdateMode = Mode;
                previousUpdateMatch = MatchWidthOrHeight;
            }
        }

        private void UpdateCamera()
        {
            if (componentCamera.m_Lens.Orthographic)
            {
                UpdateOrtho();
            }
            else
            {
                UpdatePerspective();
            }
        }

        private void UpdateOrtho()
        {
            switch (Mode)
            {
                case WorkingMode.ConstantHeight:
                    componentCamera.m_Lens.OrthographicSize = initialSize / cameraZoom;
                    break;

                case WorkingMode.ConstantWidth:
                    componentCamera.m_Lens.OrthographicSize = initialSize * (targetAspect / componentCamera.m_Lens.Aspect) / cameraZoom;
                    break;

                case WorkingMode.MatchWidthOrHeight:
                    float vSize = initialSize;
                    float hSize = initialSize * (targetAspect / componentCamera.m_Lens.Aspect);
                    float vLog = Mathf.Log(vSize, 2);
                    float hLog = Mathf.Log(hSize, 2);
                    float logWeightedAverage = Mathf.Lerp(hLog, vLog, MatchWidthOrHeight);
                    componentCamera.m_Lens.OrthographicSize = Mathf.Pow(2, logWeightedAverage) / cameraZoom;
                    break;

                case WorkingMode.Expand:
                    if (targetAspect > componentCamera.m_Lens.Aspect)
                    {
                        componentCamera.m_Lens.OrthographicSize = initialSize * (targetAspect / componentCamera.m_Lens.Aspect) / cameraZoom;
                    }
                    else
                    {
                        componentCamera.m_Lens.OrthographicSize = initialSize / cameraZoom;
                    }

                    break;

                case WorkingMode.Shrink:
                    if (targetAspect < componentCamera.m_Lens.Aspect)
                    {
                        componentCamera.m_Lens.OrthographicSize = initialSize * (targetAspect / componentCamera.m_Lens.Aspect) / cameraZoom;
                    }
                    else
                    {
                        componentCamera.m_Lens.OrthographicSize = initialSize / cameraZoom;
                    }

                    break;
                default:
                    Debug.LogError("Incorrect CameraScaler.Mode: " + Mode);
                    break;
            }
        }

        private void UpdatePerspective()
        {
            switch (Mode)
            {
                case WorkingMode.ConstantHeight:
                    componentCamera.m_Lens.FieldOfView = initialFov / cameraZoom;
                    break;

                case WorkingMode.ConstantWidth:
                    componentCamera.m_Lens.FieldOfView = CalcVerticalFov(horizontalFov, componentCamera.m_Lens.Aspect) / cameraZoom;
                    break;

                case WorkingMode.MatchWidthOrHeight:
                    float vFov = initialFov;
                    float hFov = CalcVerticalFov(horizontalFov, componentCamera.m_Lens.Aspect);
                    float vLog = Mathf.Log(vFov, 2);
                    float hLog = Mathf.Log(hFov, 2);
                    float logWeightedAverage = Mathf.Lerp(hLog, vLog, MatchWidthOrHeight);
                    componentCamera.m_Lens.FieldOfView = Mathf.Pow(2, logWeightedAverage) / cameraZoom;
                    break;

                case WorkingMode.Expand:
                    if (targetAspect > componentCamera.m_Lens.Aspect)
                    {
                        componentCamera.m_Lens.FieldOfView = CalcVerticalFov(horizontalFov, componentCamera.m_Lens.Aspect) / cameraZoom;
                    }
                    else
                    {
                        componentCamera.m_Lens.FieldOfView = initialFov / cameraZoom;
                    }

                    break;

                case WorkingMode.Shrink:
                    if (targetAspect < componentCamera.m_Lens.Aspect)
                    {
                        componentCamera.m_Lens.FieldOfView = CalcVerticalFov(horizontalFov, componentCamera.m_Lens.Aspect) / cameraZoom;
                    }
                    else
                    {
                        componentCamera.m_Lens.FieldOfView = initialFov / cameraZoom;
                    }

                    break;
                default:
                    Debug.LogError("Incorrect CameraScaler.Mode: " + Mode);
                    break;
            }
        }

        private static float CalcVerticalFov(float hFovInDeg, float aspectRatio)
        {
            float hFovInRads = hFovInDeg * Mathf.Deg2Rad;

            float vFovInRads = 2 * Mathf.Atan(Mathf.Tan(hFovInRads / 2) / aspectRatio);

            return vFovInRads * Mathf.Rad2Deg;
        }
    }
}